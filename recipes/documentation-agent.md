# Documentation Agent Recipe

## Purpose
Write technical documentation, manuals, tutorials, and guides for ComplianceOS and related projects.

## When to Use
- Writing or updating README files
- Creating API documentation
- Writing step-by-step tutorials
- Documenting architecture decisions
- Creating operations runbooks
- Writing release notes
- Documenting user-facing features

## How to Invoke

```
@documentation-agent <task description>
```

Or via delegate:
```
delegate(source: "documentation-agent", instructions: "<task>")
```

## Task Templates

### Write a Tutorial
```
Write a step-by-step tutorial for {audience} on {topic}.
Prerequisites: {list}
Save to: docs/tutorials/{slug}.md
```

### Document an API
```
Document the {name} API endpoints.
Include: request/response examples, error codes, authentication requirements.
Save to: docs/api/{name}.md
```

### Write a Runbook
```
Create an operations runbook for {scenario}.
Include: symptoms, diagnosis steps, resolution, escalation.
Save to: docs/runbooks/{scenario}.md
```

### Write Release Notes
```
Write release notes for version {version}.
Group by: Breaking Changes, New Features, Bug Fixes, Known Issues.
Include: upgrade instructions if applicable.
Save to: docs/releases/{version}.md
```

## Output Location
All documentation is saved to `D:\OneDrive - Intellfence\WebDev\ComplianceOS\docs\`

## Quality Checklist
- [ ] Accurate technical details (verified against source code)
- [ ] Clear prerequisites listed
- [ ] Step-by-step instructions where applicable
- [ ] Code examples with language tags
- [ ] Troubleshooting section for complex topics
- [ ] "Next steps" or "See also" links
- [ ] Last updated date included
