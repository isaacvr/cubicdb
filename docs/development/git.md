# Git & GitHub Conventions

## Branches

- **`main`**: main branch. Must always be in a working state.
- **Feature branches**: `feature/short-description`
- **Bug fixes**: `fix/short-description`
- **Refactors**: `refactor/short-description`
- **Docs**: `docs/short-description`
- **Chores**: `chore/short-description`

Examples:
```
feature/event-driven-timer
fix/inspection-penalty-not-applied
refactor/migrate-stores-to-runes
docs/architecture-timer
```

## Commits

Conventional Commits: https://www.conventionalcommits.org/

```
<type>(<scope>): <description>

[body]

[footer]
```

### Types

| Type | Usage |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change without behavior change |
| `docs` | Documentation |
| `test` | Add or modify tests |
| `chore` | Maintenance, dependencies, config |
| `style` | Formatting, whitespace (no logic changes) |
| `perf` | Performance improvement |

### Scope (optional)

Affected code area: `timer`, `devices`, `events`, `scramble`, `sessions`, `ui`, etc.

### Examples

```
feat(timer): add reactor for device events
fix(devices): handle stackmat disconnect during solve
refactor(events): migrate EventBus to use $state
docs(architecture): add scramble service design
test(timer): add integration tests for solve flow
chore: update svelte to 5.47
```

## Versioning

- **Strict SemVer**: `MAJOR.MINOR.PATCH`
- Version bumps are decided manually by Isaac.
- No automatic changelog for now.

## Pull Requests

Simple format. See template in `.github/pull_request_template.md`.
- Clear description of what was done and why.
- Screenshot if there are UI changes.
- Optional labels: `feature`, `bug`, `refactor`, `docs`, `breaking`.
- Keep PRs focused. Don't modify too many files unless it's a major rework.
