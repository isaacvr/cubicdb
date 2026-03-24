# Git & GitHub Conventions

## Branches

- **`main`**: rama principal. Siempre debe estar en estado funcional.
- **Feature branches**: `feature/descripcion-corta`
- **Bug fixes**: `fix/descripcion-corta`
- **Refactors**: `refactor/descripcion-corta`
- **Docs**: `docs/descripcion-corta`
- **Chores**: `chore/descripcion-corta`

Ejemplos:
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

| Type | Uso |
|---|---|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `refactor` | Cambio de código sin cambio de comportamiento |
| `docs` | Documentación |
| `test` | Agregar o modificar tests |
| `chore` | Mantenimiento, dependencias, config |
| `style` | Formateo, whitespace (no cambios de lógica) |
| `perf` | Mejora de rendimiento |

### Scope (opcional)

Área del código afectada: `timer`, `devices`, `events`, `scramble`, `sessions`, `ui`, etc.

### Ejemplos

```
feat(timer): add reactor for device events
fix(devices): handle stackmat disconnect during solve
refactor(events): migrate EventBus to use $state
docs(architecture): add scramble service design
test(timer): add integration tests for solve flow
chore: update svelte to 5.47
```

## Versionado

- **SemVer estricto**: `MAJOR.MINOR.PATCH`
- Los bumps los decide Isaac manualmente.
- No hay changelog automático por ahora.

## Pull Requests

Formato simple. Ver template en `.github/pull_request_template.md`.
- Descripción clara de qué se hizo y por qué.
- Screenshot si hay cambios de UI.
- Labels opcionales: `feature`, `bug`, `refactor`, `docs`, `breaking`.
- Mantener los PRs enfocados. No modificar demasiados archivos salvo remodelaciones grandes.
