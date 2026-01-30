---
name: spec-creator
description: |
  Create comprehensive software specifications with three-document structure: requirements.md (user stories with formal WHEN/SHALL acceptance criteria), design.md (technical architecture, code samples, data models, correctness properties, testing strategy), and tasks.md (implementation checklist with requirement traceability).

  Triggers: (1) "create a spec for [feature]", (2) "write specifications", (3) "spec out [module]", (4) "design document for", (5) "requirements document", (6) planning new features/modules, (7) before implementing complex functionality, (8) when user mentions "spec", "specification", or "design doc".
---

# Spec Creator

Create enterprise-grade software specifications using a rigorous three-document structure with formal acceptance criteria, correctness properties, and implementation traceability.

## Workflow

### Phase 1: Discovery

Before writing any spec, gather:

1. **Feature scope** - What functionality? What problem does it solve?
2. **Module dependencies** - What existing modules does this extend or depend on?
3. **Technical context** - Stack, database, hosting, constraints
4. **Domain terminology** - Business-specific terms that need definition
5. **User roles** - Who uses this feature and how?

Ask clarifying questions. Do NOT proceed without understanding the domain.

### Phase 2: Requirements Analysis

For each identified feature:

1. Write a user story: "As a [role], I want [feature], so that [benefit]"
2. Extract 3-8 acceptance criteria using WHEN/SHALL format
3. Identify validation rules and edge cases
4. Note dependencies on other requirements

### Phase 3: Technical Design

Design the implementation:

1. Draw ASCII architecture diagrams showing component relationships
2. Define API endpoints with request/response formats
3. Create data models with field types and constraints
4. Write database schema with indexes
5. Extract correctness properties for testing (see [correctness-properties.md](references/correctness-properties.md))
6. Define error handling patterns
7. Plan file structure

### Phase 4: Task Breakdown

Create implementation tasks:

1. Group tasks into logical phases
2. Add checkpoints after major phases
3. Reference requirement numbers for traceability
4. Include property-based tests for each correctness property

## Output Structure

Create specs in: `.kiro/specs/{feature-name}/`

```
.kiro/specs/{feature-name}/
├── requirements.md    # User stories + acceptance criteria
├── design.md          # Technical architecture + code samples
└── tasks.md           # Implementation checklist
```

## Document Templates

### requirements.md

See [requirements-template.md](references/requirements-template.md) for full template.

Key sections:
- **Introduction**: Overview, module dependencies, technical context
- **Glossary**: Domain terms with precise definitions
- **Requirements**: Numbered requirements with user stories and WHEN/SHALL acceptance criteria

### design.md

See [design-template.md](references/design-template.md) for full template.

Key sections:
- **Overview**: Technology stack summary
- **Architecture**: ASCII diagrams showing system layers
- **Components and Interfaces**: Code samples for services, routes, components
- **API Endpoints**: REST endpoints with methods and descriptions
- **Data Models**: Entity structures with types
- **Database Schema**: SQL with indexes
- **Correctness Properties**: Formal properties for testing (see [correctness-properties.md](references/correctness-properties.md))
- **Error Handling**: Response formats, HTTP codes, error messages
- **Testing Strategy**: Unit, property-based, integration, E2E
- **File Structure**: Directory organization

### tasks.md

See [tasks-template.md](references/tasks-template.md) for full template.

Key sections:
- **Overview**: Brief implementation summary
- **Tasks**: Numbered/nested with checkboxes, requirement references
- **Checkpoints**: Validation points between phases
- **Current Status**: Progress tracking
- **Notes**: Implementation considerations

## Acceptance Criteria Format

Use formal WHEN/SHALL language:

```markdown
1. WHEN a user [performs action], THE System SHALL [expected behavior]
2. WHEN [condition], THE System SHALL [response]
3. THE System SHALL [requirement] (for unconditional requirements)
4. IF [condition], THEN THE System SHALL [behavior]
5. THE System SHALL NOT [prohibited behavior]
6. THE System SHALL prevent [invalid action]
```

## Correctness Properties

Each design.md MUST include correctness properties - formal statements about system behavior that hold true across all valid executions. These map directly to property-based tests.

Format:
```markdown
### Property N: [Name]

_For any_ [input domain], the system should [expected invariant].

**Validates: Requirements X.Y, X.Z**
```

See [correctness-properties.md](references/correctness-properties.md) for patterns and examples.

## Quality Checklist

Before finalizing a spec:

- [ ] Every requirement has 3+ acceptance criteria
- [ ] All domain terms defined in glossary
- [ ] Architecture diagram shows all layers
- [ ] Every API endpoint documented
- [ ] Data models have all fields typed
- [ ] Database schema includes indexes
- [ ] 5+ correctness properties defined
- [ ] Error handling covers all failure modes
- [ ] Testing strategy includes property-based tests
- [ ] Every task references requirement numbers
- [ ] Checkpoints placed after major phases
