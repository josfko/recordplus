# Tasks Template

Use this template for `tasks.md` files.

## Template

```markdown
# Implementation Plan: [Feature Name]

## Overview

[1-2 sentences describing what will be implemented and its purpose]

## Tasks

- [ ] 1. [Phase Name]
  - [ ] 1.1 [Specific task]
    - [Sub-task detail]
    - [Sub-task detail]
    - _Requirements: X.Y, X.Z_
  - [ ] 1.2 [Specific task]
    - [Sub-task detail]
    - _Requirements: X.Y_
  - [ ] 1.3 Write property tests for [component]
    - **Property N: [Property Name]**
    - Test [what to test]
    - **Validates: Requirements X.Y, X.Z**

- [ ] 2. Checkpoint - [Validation description]
  - [What to verify]
  - Ask user if questions arise

- [ ] 3. [Next Phase Name]
  - [ ] 3.1 [Specific task]
    - _Requirements: X.Y_
  - [ ] 3.2 [Specific task]
    - _Requirements: X.Y_

[Continue with phases...]

- [ ] N. Final Checkpoint
  - [ ] Run all tests
  - [ ] Manual testing of all flows
  - [ ] [Deployment/release steps if applicable]

## Current Status

**COMPLETED:**
- [List completed items]

**IN PROGRESS:**
- [Current work]

**REMAINING:**
- [Remaining work]

## Notes

- [Important implementation considerations]
- [Technical decisions made]
- [Known constraints or limitations]
```

## Writing Guidelines

### Task Organization

**Phase Structure:**
1. Setup/Infrastructure tasks
2. Core functionality (backend services)
3. Checkpoint - Backend validation
4. API routes/endpoints
5. Checkpoint - API validation
6. Frontend components
7. Checkpoint - Frontend validation
8. Integration and polish
9. Final checkpoint

**Task Numbering:**
- Top-level phases: `1.`, `2.`, `3.`
- Sub-tasks: `1.1`, `1.2`, `1.3`
- Nested details: bullet points under sub-tasks

**Checkbox Format:**
```markdown
- [ ] Incomplete task
- [x] Completed task
```

### Requirement Traceability

Every implementation task MUST reference its requirements:

```markdown
- [ ] 3.2 Implement POST /api/users endpoint
  - Validate email format
  - Hash password before storing
  - Return created user without password
  - _Requirements: 2.1, 2.3, 2.5_
```

### Property Test Tasks

Include property tests as explicit tasks:

```markdown
- [ ] 2.4 Write property tests for UserService
  - **Property 3: Email Uniqueness**
  - Test that no two users can have same email
  - **Validates: Requirements 2.4, 5.1**
```

### Checkpoints

Place checkpoints after each major phase:

```markdown
- [ ] 4. Checkpoint - Backend Services Complete
  - Run all unit tests
  - Run all property tests
  - Verify database migrations work
  - Ask user if questions arise
```

Checkpoint purposes:
- Validate work before proceeding
- Catch issues early
- Get user feedback on blockers
- Ensure tests pass before adding complexity

### Current Status Section

Update this section as work progresses:

```markdown
## Current Status

**COMPLETED:**
- Full backend (API, services, database)
- All property-based tests
- Database migrations

**IN PROGRESS:**
- Frontend dashboard component

**REMAINING:**
- Frontend form components
- Integration testing
- Deployment scripts
```

### Notes Section

Include important context:

```markdown
## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation uses existing database schema
```

## Task Granularity Guidelines

**Too Coarse:**
```markdown
- [ ] 1. Implement backend
```

**Too Fine:**
```markdown
- [ ] 1.1 Create file src/services/user.js
- [ ] 1.2 Add import statement for database
- [ ] 1.3 Write constructor
```

**Just Right:**
```markdown
- [ ] 1.1 Implement UserService class
  - Create src/server/services/userService.js
  - Implement create, getById, update, delete methods
  - Add validation for required fields
  - _Requirements: 1.1, 1.2, 1.3_
```

## Example: Well-Structured Tasks

```markdown
## Tasks

- [x] 1. Project Setup and Infrastructure
  - [x] 1.1 Initialize project structure with package.json
  - [x] 1.2 Create database schema and migrations
  - [x] 1.3 Set up Express server with middleware
    - CORS configuration
    - JSON body parser
    - Error handler middleware
    - _Requirements: 8.1, 8.2_

- [x] 2. Database Layer and Services
  - [x] 2.1 Implement database connection wrapper
    - _Requirements: 8.1_
  - [x] 2.2 Implement UserService
    - Create, read, update, delete operations
    - Email uniqueness validation
    - Password hashing
    - _Requirements: 1.1, 1.2, 1.3, 2.4_
  - [x] 2.3 Write property tests for UserService
    - **Property 1: Email Format Validation**
    - **Property 2: Email Uniqueness**
    - **Property 3: Password Never Returned**
    - **Validates: Requirements 1.1, 2.4, 3.1**

- [x] 3. Checkpoint - Backend Services ✓
  - Run unit tests
  - Run property tests
  - Verify service methods work correctly

- [ ] 4. API Routes
  - [ ] 4.1 Implement user routes
    - POST /api/users (create)
    - GET /api/users/:id (read)
    - PUT /api/users/:id (update)
    - DELETE /api/users/:id (delete)
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [ ] 4.2 Add input validation middleware
    - _Requirements: 2.1, 2.2_
  - [ ] 4.3 Write integration tests
    - Test full request/response cycle
    - _Requirements: All_

- [ ] 5. Checkpoint - API Complete
  - All routes return correct responses
  - Error handling works for all cases
  - Integration tests pass
```
