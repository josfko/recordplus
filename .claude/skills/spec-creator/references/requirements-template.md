# Requirements Template

Use this template for `requirements.md` files.

## Template

```markdown
# Requirements Document

## Introduction

[1-2 paragraphs describing the module/feature purpose and scope]

**Module Dependencies:**

- `dependency-1`: Description of what it provides
- `dependency-2`: Description of what it provides

**Technical Context:**

- Backend: [stack details]
- Frontend: [stack details]
- Database: [database type]
- Hosting: [hosting details]
- Existing tables/resources: [list relevant existing resources]

## Design Reference (optional)

[If UI-related, include design system details:]

- **Theme**: [Light/Dark, design style]
- **Colors**: [Primary colors with hex codes]
- **Typography**: [Font families]
- **Component styles**: [Badge colors, button styles, etc.]

## Glossary

| Term | Definition |
|------|------------|
| **Term_Name** | Precise definition of the domain term |
| **Another_Term** | Another definition |

[Include all domain-specific terminology that appears in the requirements]

## Requirements

### Requirement 1: [Feature Name]

**User Story:** As a [role], I want [feature], so that [benefit].

#### Acceptance Criteria

1. WHEN a user [performs action], THE System SHALL [expected behavior]
2. WHEN [condition], THE System SHALL [response]
3. THE System SHALL [unconditional requirement]
4. THE System SHALL validate that [validation rule]
5. THE System SHALL prevent [invalid action]
6. IF [condition], THEN THE System SHALL [behavior]

### Requirement 2: [Feature Name]

**User Story:** As a [role], I want [feature], so that [benefit].

#### Acceptance Criteria

1. WHEN a user [performs action], THE System SHALL [expected behavior]
2. [Continue with criteria...]

[Continue with additional requirements...]
```

## Writing Guidelines

### Introduction Section

- State what the module does in 1-2 clear paragraphs
- List ALL module dependencies with what each provides
- Include full technical context (stack, database, hosting)
- Reference existing tables/resources this module interacts with

### Glossary Section

- Define EVERY domain-specific term used in requirements
- Use Title_Case with underscores for multi-word terms
- Definitions should be precise and unambiguous
- Include abbreviations and their expansions
- Order alphabetically or by category

### Requirements Section

**Numbering:**
- Main requirements: `### Requirement N: [Name]`
- Acceptance criteria: numbered list under each requirement
- Reference format: `Requirement 3.2` means Requirement 3, Criterion 2

**User Story Format:**
```
As a [specific role],
I want [concrete feature],
so that [clear benefit].
```

**Acceptance Criteria Patterns:**

| Pattern | When to Use | Example |
|---------|-------------|---------|
| `WHEN...SHALL` | User-initiated actions | WHEN a user clicks "Save", THE System SHALL persist the data |
| `THE System SHALL` | Unconditional requirements | THE System SHALL encrypt all passwords |
| `THE System SHALL NOT` | Prohibitions | THE System SHALL NOT expose internal IDs |
| `IF...THEN` | Conditional behavior | IF the session expires, THEN THE System SHALL redirect to login |
| `THE System SHALL prevent` | Security/validation | THE System SHALL prevent SQL injection |
| `THE System SHALL validate` | Input validation | THE System SHALL validate email format |

**Criteria Count:**
- Minimum 3 criteria per requirement
- Maximum 8 criteria per requirement
- If more needed, split into sub-requirements

### Cross-Referencing

Reference other requirements when there are dependencies:
```markdown
7. WHEN a case is archived (see Requirement 4), THE System SHALL...
```

## Example: Well-Written Requirement

```markdown
### Requirement 3: User Authentication

**User Story:** As a user, I want to securely log into the system, so that my data remains private and I can access my personalized features.

#### Acceptance Criteria

1. WHEN a user submits valid credentials, THE System SHALL create an authenticated session
2. WHEN a user submits invalid credentials, THE System SHALL display an error message without revealing which field was incorrect
3. THE System SHALL lock the account after 5 consecutive failed login attempts
4. THE System SHALL require passwords to be at least 8 characters with mixed case and numbers
5. IF a session is inactive for 30 minutes, THEN THE System SHALL automatically log out the user
6. THE System SHALL NOT store passwords in plain text
7. THE System SHALL log all authentication attempts with timestamp and IP address
```

## Common Mistakes to Avoid

1. **Vague criteria**: "THE System SHALL be fast" → "THE System SHALL respond within 200ms"
2. **Missing validation**: Always specify input validation rules
3. **No error handling**: Include criteria for failure scenarios
4. **Implementation details**: Requirements say WHAT, not HOW
5. **Missing edge cases**: Consider empty states, limits, concurrent users
6. **Undefined terms**: Every domain term must be in glossary
