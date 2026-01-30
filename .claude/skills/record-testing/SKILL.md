---
name: record-testing
description: Property-based testing patterns for Record+ using Vitest and fast-check. Use when writing tests, adding test coverage, or implementing validation rules. Triggers on requests to write tests, add test coverage, or validate business rules.
---

# Record+ Testing Patterns

## Stack

- **Test Runner:** Vitest
- **Property Testing:** fast-check
- **Location:** `src/server/__tests__/*.test.js`

## Running Tests

```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
npm test -- filename  # Run specific file
```

## Test File Structure

```javascript
import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import * as fc from "fast-check";
import { closeDatabase, execute } from "../database.js";
import { serviceFunction, ValidationError } from "../services/someService.js";

// Track created IDs for cleanup
let createdIds = [];

afterEach(() => {
  for (const id of createdIds) {
    try { deleteItem(id); } catch (e) {}
  }
  createdIds = [];
});

afterAll(() => {
  closeDatabase();
});

describe("Service Name - Property Tests", () => {
  it("should validate something", () => {
    fc.assert(
      fc.property(
        fc.string(),
        (input) => {
          // Property must return true or throw
          return someCondition(input);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

## fast-check Arbitraries

### Valid ARAG Reference
```javascript
const validAragRef = () =>
  fc.stringOf(
    fc.constantFrom("0", "1", "2", "3", "4", "5", "6", "7", "8", "9"),
    { minLength: 6, maxLength: 6 }
  ).map((digits) => `DJ00${digits}`);
```

### Valid Date (YYYY-MM-DD)
```javascript
const validDate = () =>
  fc.date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") })
    .map((d) => d.toISOString().split("T")[0]);
```

### Non-Empty String
```javascript
const nonEmptyString = () =>
  fc.string({ minLength: 1, maxLength: 100 })
    .filter((s) => s.trim().length > 0);
```

### Case Type
```javascript
const caseType = () => fc.constantFrom("ARAG", "PARTICULAR", "TURNO_OFICIO");
```

### Case State
```javascript
const caseState = () => fc.constantFrom("ABIERTO", "JUDICIAL", "ARCHIVADO");
```

### Judicial District
```javascript
const district = () => fc.constantFrom(
  "Torrox", "Vélez-Málaga", "Torremolinos",
  "Fuengirola", "Marbella", "Estepona", "Antequera"
);
```

## Property Test Patterns

### Validation Rejection
```javascript
it("should reject invalid input", () => {
  fc.assert(
    fc.property(
      fc.oneof(
        fc.constant(null),
        fc.constant(undefined),
        fc.constant(""),
        fc.constant("   ")
      ),
      (invalidInput) => {
        try {
          serviceFunction({ field: invalidInput });
          return false; // Should have thrown
        } catch (e) {
          return e instanceof ValidationError && e.field === "field";
        }
      }
    ),
    { numRuns: 100 }
  );
});
```

### Valid Input Acceptance
```javascript
it("should accept valid input", () => {
  fc.assert(
    fc.property(
      nonEmptyString(),
      validDate(),
      (name, date) => {
        const result = create({ name, date });
        createdIds.push(result.id);
        return result.id > 0 && result.name === name.trim();
      }
    ),
    { numRuns: 50 }
  );
});
```

### Uniqueness
```javascript
it("should enforce unique references", () => {
  fc.assert(
    fc.property(
      validAragRef(),
      nonEmptyString(),
      (ref, name) => {
        const first = create({ type: "ARAG", clientName: name, aragReference: ref });
        createdIds.push(first.id);

        try {
          create({ type: "ARAG", clientName: name, aragReference: ref });
          return false; // Should have thrown
        } catch (e) {
          return e instanceof ConflictError;
        }
      }
    ),
    { numRuns: 20 }
  );
});
```

### State Transitions
```javascript
it("should only allow valid state transitions", () => {
  fc.assert(
    fc.property(
      nonEmptyString(),
      validAragRef(),
      validDate(),
      district(),
      (name, ref, date, dist) => {
        const case1 = create({ type: "ARAG", clientName: name, aragReference: ref });
        createdIds.push(case1.id);

        // ABIERTO -> JUDICIAL should work
        const judicial = transitionToJudicial(case1.id, date, dist);
        return judicial.state === "JUDICIAL";
      }
    ),
    { numRuns: 20 }
  );
});
```

## Required Test Properties

Per CLAUDE.md, tests must verify:

1. **ARAG reference format:** `/^DJ00\d{6}$/`
2. **Internal reference uniqueness**
3. **Sequential numbering for Particular cases**
4. **Required fields validation**
5. **Archive requires closure date**
6. **State transition validity**
7. **Dashboard metrics accuracy**
8. **Configuration value validation**
9. **Export/import round-trip**

## Cleanup Pattern

Always clean up created records:

```javascript
let createdIds = [];

afterEach(() => {
  for (const id of createdIds) {
    try { deleteItem(id); } catch (e) {}
  }
  createdIds = [];
});

// In tests:
const item = create({ ... });
createdIds.push(item.id);
```

## Database Isolation

Tests use the same database. To isolate:

```javascript
beforeEach(() => {
  // Reset counters if testing reference generation
  resetCounter("ARAG");
});
```
