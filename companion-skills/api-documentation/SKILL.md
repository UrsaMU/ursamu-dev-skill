---
name: api-documentation
description: "API documentation workflow for generating OpenAPI specs, creating developer guides, and maintaining comprehensive API documentation."
category: granular-workflow-bundle
risk: safe
source: personal
date_added: "2026-02-27"
audited_by: lcanady
last_audited: "2026-03-21"
audit_status: safe
---

# API Documentation Workflow

## Overview

Specialized workflow for creating comprehensive API documentation including OpenAPI/Swagger specs, developer guides, code examples, and interactive documentation.

## When to Use This Workflow

Use this workflow when:
- Creating API documentation
- Generating OpenAPI specs
- Writing developer guides
- Adding code examples
- Setting up API portals

## Workflow Phases

### Phase 1: API Discovery

#### Actions
1. Inventory endpoints
2. Document request/response shapes
3. Identify authentication methods
4. Map error codes
5. Note rate limits

#### Prompt
```
Discover and document all API endpoints in this codebase. List routes, methods, parameters, and response shapes.
```

### Phase 2: OpenAPI Specification

#### Actions
1. Create OpenAPI schema
2. Define paths and operations
3. Add request/response schemas
4. Configure security schemes
5. Add realistic examples

#### Prompt
```
Generate a complete OpenAPI 3.1 specification for this API based on the discovered endpoints.
```

### Phase 3: Developer Guide

#### Actions
1. Write getting started guide
2. Document authentication flow
3. Cover common usage patterns
4. Add troubleshooting section
5. Create FAQ

#### Prompt
```
Write a comprehensive developer guide covering authentication, common patterns, and troubleshooting.
```

### Phase 4: Code Examples

#### Actions
1. Create example requests (curl)
2. Write SDK/client examples
3. Show request/response pairs
4. Cover error handling examples
5. Test all examples

#### Prompt
```
Generate code examples for the top 5 most common API use cases, including curl, TypeScript, and error handling.
```

### Phase 5: Interactive Docs

#### Actions
1. Set up Swagger UI or Redoc
2. Configure try-it functionality
3. Test interactivity
4. Deploy docs

#### Prompt
```
Set up interactive API documentation using the generated OpenAPI spec.
```

### Phase 6: Maintenance Automation

#### Actions
1. Configure auto-generation from code
2. Add spec validation to CI
3. Set up review process
4. Schedule updates

#### Prompt
```
Set up automated OpenAPI spec generation and validation in CI/CD.
```

## Quality Gates

- [ ] OpenAPI spec complete and valid
- [ ] Developer guide written
- [ ] Code examples tested and working
- [ ] Interactive docs functional
- [ ] Documentation deployed and linked from README

## Best Practices

- Keep spec in sync with implementation (generate from code, not by hand)
- Version your API docs alongside your API
- Include changelog in docs
- Test examples against real endpoints
- Use consistent terminology throughout
