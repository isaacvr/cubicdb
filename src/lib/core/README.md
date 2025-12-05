Clean Architecture core

This folder contains the core building blocks for the Clean Architecture migration:

- domain: domain models and business rules (types are imported from the existing `@interfaces` to avoid duplication).
- ports: TypeScript interfaces (boundaries) that the outer layers must implement.
- usecases: interactors (business logic) that depend only on domain and ports.

Start small: implement one use-case (AddSolve) and a repository port. Then create adapters for existing services and a controller that the UI can call.

Follow the repo's path aliases (e.g., `@interfaces`) so new files integrate smoothly with current code.
