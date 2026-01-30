# Correctness Properties Guide

Correctness properties are formal statements about system behavior that should hold true across ALL valid executions. They bridge human-readable requirements and machine-verifiable tests.

## What Makes a Good Property

A property is NOT:
- A single test case
- An implementation detail
- A performance requirement

A property IS:
- A universal statement ("for any valid input...")
- An invariant that must always hold
- Directly testable with property-based testing

## Property Format

```markdown
### Property N: [Descriptive Name]

_For any_ [input domain description], the system should [expected invariant].

**Validates: Requirements X.Y, X.Z**
```

## Property Patterns

### Pattern 1: Format Validation

For inputs that must match a specific pattern:

```markdown
### Property 1: Email Format Validation

_For any_ string input as email address, the system should accept it if and only if it matches the standard email format (local@domain.tld).

**Validates: Requirements 2.1, 2.5**
```

**Test Implementation:**
```javascript
fc.assert(
  fc.property(fc.emailAddress(), (validEmail) => {
    expect(validateEmail(validEmail)).toBe(true);
  })
);

fc.assert(
  fc.property(
    fc.string().filter(s => !isValidEmailFormat(s)),
    (invalidEmail) => {
      expect(validateEmail(invalidEmail)).toBe(false);
    }
  )
);
```

### Pattern 2: Uniqueness Constraints

For fields that must be unique:

```markdown
### Property 2: Reference Uniqueness

_For any_ sequence of entities created, all generated references should be unique across the entire system, and no reference should ever be reused even after deletion.

**Validates: Requirements 3.1, 3.4**
```

**Test Implementation:**
```javascript
fc.assert(
  fc.property(
    fc.array(fc.record({ name: fc.string() }), { minLength: 2, maxLength: 100 }),
    (entities) => {
      const references = entities.map(e => createEntity(e).reference);
      const uniqueRefs = new Set(references);
      return uniqueRefs.size === references.length;
    }
  )
);
```

### Pattern 3: Sequential Numbering

For auto-incrementing or sequential values:

```markdown
### Property 3: Sequential Invoice Numbers

_For any_ sequence of N invoices created within the same year, the invoice numbers should be consecutive starting from 001.

**Validates: Requirements 4.2, 4.3**
```

**Test Implementation:**
```javascript
fc.assert(
  fc.property(
    fc.integer({ min: 1, max: 100 }),
    (count) => {
      const invoices = Array.from({ length: count }, () => createInvoice());
      const numbers = invoices.map(i => parseInt(i.number.slice(-3)));
      for (let i = 1; i < numbers.length; i++) {
        if (numbers[i] !== numbers[i-1] + 1) return false;
      }
      return true;
    }
  )
);
```

### Pattern 4: Required Fields Validation

For mandatory input validation:

```markdown
### Property 4: Required Fields Enforcement

_For any_ entity creation attempt, the operation should fail if any required field (name, email, type) is missing, null, empty, or whitespace-only.

**Validates: Requirements 1.3, 1.4, 1.5**
```

**Test Implementation:**
```javascript
fc.assert(
  fc.property(
    fc.record({
      name: fc.oneof(fc.constant(null), fc.constant(''), fc.constant('   ')),
      email: fc.emailAddress(),
      type: fc.string()
    }),
    (invalidEntity) => {
      expect(() => createEntity(invalidEntity)).toThrow();
    }
  )
);
```

### Pattern 5: State Transitions

For finite state machines:

```markdown
### Property 5: Valid State Transitions

_For any_ entity state transition, the new state should be reachable from the current state according to the state machine: DRAFT → PENDING → APPROVED → COMPLETED, or DRAFT → CANCELLED, or PENDING → REJECTED.

**Validates: Requirements 5.1, 5.2, 5.3**
```

**Test Implementation:**
```javascript
const VALID_TRANSITIONS = {
  'DRAFT': ['PENDING', 'CANCELLED'],
  'PENDING': ['APPROVED', 'REJECTED'],
  'APPROVED': ['COMPLETED'],
  'COMPLETED': [],
  'CANCELLED': [],
  'REJECTED': []
};

fc.assert(
  fc.property(
    fc.constantFrom('DRAFT', 'PENDING', 'APPROVED'),
    fc.constantFrom('DRAFT', 'PENDING', 'APPROVED', 'COMPLETED', 'CANCELLED', 'REJECTED'),
    (fromState, toState) => {
      const isValid = VALID_TRANSITIONS[fromState].includes(toState);
      if (isValid) {
        expect(() => transition(fromState, toState)).not.toThrow();
      } else {
        expect(() => transition(fromState, toState)).toThrow();
      }
    }
  )
);
```

### Pattern 6: Calculation Correctness

For mathematical operations:

```markdown
### Property 6: Total Amount Calculation

_For any_ base amount B and tax rate R, the total should equal B + (B × R / 100), with the tax amount being exactly (B × R / 100).

**Validates: Requirements 6.3, 6.4**
```

**Test Implementation:**
```javascript
fc.assert(
  fc.property(
    fc.float({ min: 0.01, max: 10000, noNaN: true }),
    fc.float({ min: 0, max: 100, noNaN: true }),
    (base, rate) => {
      const expected = base + (base * rate / 100);
      const result = calculateTotal(base, rate);
      return Math.abs(result - expected) < 0.01; // Allow small float precision error
    }
  )
);
```

### Pattern 7: Data Round-Trip

For persistence operations:

```markdown
### Property 7: Data Persistence Round-Trip

_For any_ valid entity object, saving it to the database and then retrieving it should produce an equivalent object (excluding system-generated fields like id and timestamps).

**Validates: Requirements 8.1, 8.3**
```

**Test Implementation:**
```javascript
fc.assert(
  fc.property(
    fc.record({
      name: fc.string({ minLength: 1 }),
      email: fc.emailAddress(),
      status: fc.constantFrom('ACTIVE', 'INACTIVE')
    }),
    async (entity) => {
      const saved = await db.create(entity);
      const retrieved = await db.getById(saved.id);
      expect(retrieved.name).toBe(entity.name);
      expect(retrieved.email).toBe(entity.email);
      expect(retrieved.status).toBe(entity.status);
    }
  )
);
```

### Pattern 8: Authorization Restrictions

For access control:

```markdown
### Property 8: Archived Entity Immutability

_For any_ archived entity, modification operations (except for notes/comments) should fail with an appropriate error.

**Validates: Requirements 7.4, 7.5**
```

**Test Implementation:**
```javascript
fc.assert(
  fc.property(
    fc.record({ name: fc.string(), status: fc.string() }),
    (updates) => {
      const archived = createEntity({ status: 'ARCHIVED' });
      expect(() => updateEntity(archived.id, updates)).toThrow('Cannot modify archived entity');
    }
  )
);
```

### Pattern 9: List/Set Membership

For enum or allowed value validation:

```markdown
### Property 9: Valid Category Selection

_For any_ category assignment, the category must be one of: Electronics, Clothing, Food, Books, Other.

**Validates: Requirements 3.2**
```

**Test Implementation:**
```javascript
const VALID_CATEGORIES = ['Electronics', 'Clothing', 'Food', 'Books', 'Other'];

fc.assert(
  fc.property(
    fc.constantFrom(...VALID_CATEGORIES),
    (validCategory) => {
      expect(() => setCategory(validCategory)).not.toThrow();
    }
  )
);

fc.assert(
  fc.property(
    fc.string().filter(s => !VALID_CATEGORIES.includes(s)),
    (invalidCategory) => {
      expect(() => setCategory(invalidCategory)).toThrow();
    }
  )
);
```

### Pattern 10: Ordering/Sorting

For list operations:

```markdown
### Property 10: History Chronological Order

_For any_ history query result, items should be returned in descending order by date (most recent first).

**Validates: Requirements 10.5**
```

**Test Implementation:**
```javascript
fc.assert(
  fc.property(
    fc.integer({ min: 1, max: 50 }),
    async (count) => {
      // Create items with random delays
      for (let i = 0; i < count; i++) {
        await createHistoryEntry();
        await delay(Math.random() * 10);
      }

      const history = await getHistory();
      for (let i = 1; i < history.length; i++) {
        const current = new Date(history[i].created_at);
        const previous = new Date(history[i-1].created_at);
        if (current > previous) return false;
      }
      return true;
    }
  )
);
```

## Mapping Properties to Requirements

Each property should validate one or more specific requirements:

| Property | Validates | Type |
|----------|-----------|------|
| Property 1 | 2.1, 2.5 | Format validation |
| Property 2 | 3.1, 3.4 | Uniqueness |
| Property 3 | 4.2, 4.3 | Sequential numbering |
| Property 4 | 1.3, 1.4 | Required fields |
| Property 5 | 5.1, 5.2 | State transitions |

## Minimum Properties Per Feature

| Feature Complexity | Minimum Properties |
|-------------------|-------------------|
| Simple CRUD | 3-5 |
| Business logic | 5-8 |
| Complex workflow | 8-12 |
| Financial/critical | 10-15 |

## Common Property Categories

1. **Input Validation** - Format, required fields, ranges
2. **Uniqueness** - References, emails, usernames
3. **State Management** - Transitions, immutability
4. **Calculations** - Totals, percentages, aggregations
5. **Data Integrity** - Round-trip, referential integrity
6. **Authorization** - Access control, permissions
7. **Ordering** - Sort order, pagination
8. **Concurrency** - Race conditions, atomic operations
