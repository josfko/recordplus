# Design Template

Use this template for `design.md` files.

## Template

```markdown
# Design Document: [Feature Name]

## Overview

[1-2 paragraphs describing the technical approach]

**Technology Stack:**

- **Frontend**: [framework, styling approach]
- **Backend**: [runtime, framework, ORM]
- **Database**: [type, location]
- **External Services**: [APIs, cloud services]

## Architecture

[ASCII diagram showing system layers and data flow]

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Component A   │  │   Component B   │  │   Component C   │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           └────────────────────┼────────────────────┘           │
│                                │                                 │
│                         ┌──────┴──────┐                         │
│                         │  API Client │                         │
│                         └──────┬──────┘                         │
└────────────────────────────────┼────────────────────────────────┘
                                 │ HTTP/JSON
┌────────────────────────────────┼────────────────────────────────┐
│                         Backend Layer                            │
│                                │                                 │
│  ┌─────────────────────────────┼─────────────────────────────┐  │
│  │                        API Routes                          │  │
│  │  GET  /api/resource          - List resources              │  │
│  │  POST /api/resource          - Create resource             │  │
│  │  GET  /api/resource/:id      - Get by ID                   │  │
│  │  PUT  /api/resource/:id      - Update resource             │  │
│  │  DELETE /api/resource/:id    - Delete resource             │  │
│  └─────────────────────────────┬─────────────────────────────┘  │
│                                │                                 │
│  ┌─────────────────────────────┼─────────────────────────────┐  │
│  │                         Services                           │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │  │
│  │  │  Service A   │  │  Service B   │  │  Service C   │     │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘     │  │
│  └─────────────────────────────┬─────────────────────────────┘  │
│                                │                                 │
│                    ┌───────────┴───────────┐                    │
│                    │      Database         │                    │
│                    └───────────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

1. **Frontend Layer**
   - [Describe UI responsibilities]
   - [Describe state management approach]

2. **Backend Layer**
   - [Describe API responsibilities]
   - [Describe business logic location]

3. **Data Layer**
   - [Describe database responsibilities]
   - [Describe caching strategy if any]

## Components and Interfaces

### [Service Name] Service

```javascript
// src/server/services/[serviceName].js
export class ServiceName {
  constructor(dependencies) {
    // Initialize dependencies
  }

  /**
   * Method description
   * @param {Type} param - Description
   * @returns {Promise<Type>} Description
   */
  async methodName(param) {
    // Implementation
  }
}
```

### [Another Service]

[Continue with other services...]

### API Routes

```javascript
// src/server/routes/[routeName].js
import { Router } from 'express';
import { ServiceName } from '../services/serviceName.js';

const router = Router();

/**
 * GET /api/[resource]
 * Description of what this endpoint does
 */
router.get('/', async (req, res, next) => {
  try {
    // Implementation
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export { router };
```

### Frontend Components

```javascript
// src/client/js/components/[componentName].js
export class ComponentName {
  constructor(container) {
    this.container = container;
  }

  async render() {
    const data = await api.getData();
    this.container.innerHTML = this.template(data);
    this.bindEvents();
  }

  template(data) {
    return `
      <div class="component">
        <!-- HTML structure -->
      </div>
    `;
  }

  bindEvents() {
    // Event handlers
  }
}
```

## API Endpoints

```
METHOD /api/path          - Description
METHOD /api/path/:id      - Description
METHOD /api/path/:id/sub  - Description
```

[Document each endpoint with:]
- HTTP method
- Path with parameters
- Brief description
- Request body (if applicable)
- Response format

## Data Models

### [Entity Name]

```javascript
{
  id: Number,                    // Primary key (auto-increment)
  field_name: String,            // Description, constraints
  another_field: Number | null,  // Description, nullable
  status: String,                // 'VALUE_1' | 'VALUE_2' | 'VALUE_3'
  created_at: String,            // ISO timestamp
  updated_at: String             // ISO timestamp
}
```

### [Another Entity]

[Continue with other entities...]

## Database Schema

```sql
-- Main table
CREATE TABLE table_name (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  field_name TEXT NOT NULL,
  another_field INTEGER,
  status TEXT NOT NULL DEFAULT 'DEFAULT' CHECK (status IN ('VALUE_1', 'VALUE_2', 'VALUE_3')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Related table
CREATE TABLE related_table (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER NOT NULL REFERENCES table_name(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX idx_table_field ON table_name(field_name);
CREATE INDEX idx_related_parent ON related_table(parent_id);
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system._

### Property 1: [Property Name]

_For any_ [input domain], the system should [expected invariant].

**Validates: Requirements X.Y, X.Z**

### Property 2: [Property Name]

_For any_ [input domain], [condition] should [expected behavior].

**Validates: Requirements X.Y**

[Continue with properties... minimum 5 properties]

## Error Handling

### API Error Response Format

```javascript
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "field": "fieldName"  // Optional, for validation errors
  }
}
```

### HTTP Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200  | Success | Request completed successfully |
| 400  | Bad Request | Validation error, invalid input |
| 401  | Unauthorized | Missing or invalid authentication |
| 403  | Forbidden | Authenticated but not authorized |
| 404  | Not Found | Resource doesn't exist |
| 409  | Conflict | Duplicate resource, constraint violation |
| 500  | Server Error | Unexpected server-side error |

### Error Messages

```javascript
const ERROR_MESSAGES = {
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Invalid input',
  DUPLICATE: 'Resource already exists',
  // Add domain-specific messages
};
```

## Testing Strategy

### Unit Tests

- [Specific unit test focus areas]
- [Validation logic]
- [Business rules]

### Property-Based Tests

Using fast-check library, minimum 100 iterations per property.

```javascript
// Example: Property 1 test
// Feature: [feature-name], Property 1: [Property Name]
// Validates: Requirements X.Y, X.Z
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

describe('[Property Name]', () => {
  it('should [expected behavior]', () => {
    fc.assert(
      fc.property(
        fc.[arbitrary](),
        (input) => {
          const result = functionUnderTest(input);
          expect(result).toBe(expectedValue);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Tests

- [Full flow tests]
- [Multi-service interactions]
- [Database round-trip tests]

### End-to-End Tests

- [User journey tests]
- [Critical path tests]

## File Structure

```
project/
├── src/
│   ├── server/
│   │   ├── index.js
│   │   ├── database.js
│   │   ├── routes/
│   │   │   └── [routeName].js
│   │   ├── services/
│   │   │   └── [serviceName].js
│   │   └── __tests__/
│   │       └── [testName].test.js
│   └── client/
│       ├── index.html
│       ├── css/
│       │   └── main.css
│       └── js/
│           ├── app.js
│           ├── api.js
│           └── components/
│               └── [componentName].js
├── migrations/
│   └── 001_initial_schema.sql
└── package.json
```

## CSS Design Tokens (if frontend)

```css
:root {
  /* Colors */
  --bg-primary: #value;
  --bg-secondary: #value;
  --text-primary: #value;
  --text-secondary: #value;

  /* Typography */
  --font-sans: 'Font Name', sans-serif;
  --font-mono: 'Mono Font', monospace;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
}
```

## Deployment Notes (optional)

[Include if deployment-specific configuration is needed]
```

## Writing Guidelines

### Architecture Diagram

- Use ASCII box drawing characters: `┌ ┐ └ ┘ ─ │ ┬ ┴ ├ ┤ ┼`
- Show all system layers (frontend, API, services, database)
- Include data flow arrows
- Label connections with protocols/formats

### Code Samples

- Include realistic, working code (not pseudocode)
- Add JSDoc comments for methods
- Show error handling patterns
- Use actual project naming conventions

### Data Models

- Document every field with type and description
- Show nullable fields with `| null`
- Use union types for enums: `'A' | 'B' | 'C'`
- Include timestamps (created_at, updated_at)

### Database Schema

- Use appropriate CHECK constraints
- Include foreign key relationships
- Add indexes for frequently queried fields
- Show CASCADE behavior for deletions

### Correctness Properties

- Minimum 5 properties per design
- Each property maps to 1+ requirements
- Use "For any" to indicate universal quantification
- Focus on invariants, not implementation details

See [correctness-properties.md](correctness-properties.md) for detailed patterns.
