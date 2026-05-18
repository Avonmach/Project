# Extract app elements

- Moved browser DOM discovery for the main application shell into `src/infrastructure/browser/app-elements.ts`.
- Left `main.ts` responsible for orchestration while reducing its direct browser query setup.
