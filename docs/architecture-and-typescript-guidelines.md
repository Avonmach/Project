# Architecture and TypeScript Guidelines

This document is the project reference for future readability, architecture, and TypeScript migration work.

## Current project state

- The project is currently plain JavaScript, HTML, and CSS.
- `app.js` contains most frontend behavior: image loading, slot detection, OCR, artefact matching, correction UI, export logic, and rendering.
- `server.js` is not a real application backend. It is a small static file server for local development.
- Data is local JSON and local image assets under `data/`.
- The first architecture goal should be readability and testability, not introducing framework complexity too early.

## Recommended Patterns.dev patterns

Use these patterns because they match current pain points in the project:

- Module Pattern: split the large `app.js` file into focused modules with explicit imports and exports.
- Factory Pattern: create repeatable objects such as OCR templates, detection records, artefact references, and debug views without scattering object literals.
- Observer Pattern: keep rendering in sync when detections, filters, active tab, or manual corrections change.
- Mediator/Middleware Pattern: centralize UI events so DOM handlers do not directly mutate deep recognition logic.
- Static Import: use normal imports for core OCR, image processing, matching, data loading, and UI modules.
- Dynamic Import: lazy-load heavier or rarely used panels such as OCR debug, export/report tooling, or collection overview after the main analyzer works.
- Bundle Splitting: keep recognition code, UI code, data access, and debug views in separate chunks once a bundler is introduced.
- List Virtualization: consider it only if result tables become large enough to hurt rendering.
- Tree Shaking: use named exports and avoid global side effects so unused helpers can be removed by the bundler.

Avoid forcing these unless a concrete problem appears:

- Singleton Pattern: ES modules already give shared module state where needed.
- Mixin Pattern: not currently useful for this project.
- Proxy Pattern: useful for advanced validation or state tracing, but likely unnecessary now.

Source: https://www.patterns.dev/

## Clean architecture mapping for this project

Use clean architecture as a folder organization guide, not as heavy enterprise boilerplate.

Proposed frontend structure:

```text
src/
  domain/
    artefacts/
    archaeology/
    ocr/
  application/
    analyze-screenshot/
    calculate-materials/
    correct-detection/
  infrastructure/
    browser/
    data/
    image-processing/
  presentation/
    components/
    state/
    renderers/
  main.ts
```

Layer rules:

- `domain/`: pure types and rules. No DOM, no canvas elements, no fetch.
- `application/`: use cases that coordinate domain logic, such as `analyzeScreenshot`.
- `infrastructure/`: browser APIs, canvas/ImageData helpers, JSON loading, local asset paths.
- `presentation/`: DOM rendering, event handlers, tabs, tables, forms, debug panels.
- Dependencies point inward: presentation and infrastructure can call application/domain; domain must not call presentation or infrastructure.

Reference repos:

- https://github.com/AzouKr/typescript-clean-architecture
- https://github.com/pvarentsov/typescript-clean-architecture

## TypeScript migration guidelines

Adopt TypeScript incrementally:

- Start with a bundler and `strict` TypeScript.
- Convert files by module boundary, not by random helper function.
- Define domain types early: `Detection`, `ArtefactReference`, `QuantityDebug`, `DigitTemplate`, `MaterialRecipe`, `AnalysisExport`.
- Prefer `unknown` over `any` at boundaries, then validate or narrow.
- Use explicit return types for exported functions.
- Keep pure OCR and matching functions easy to unit test.
- Avoid TypeScript enums unless there is a strong reason; prefer literal unions such as `"damaged" | "restored"`.
- Use `readonly` for data loaded from reference JSON where practical.
- Keep DOM access typed and localized in presentation/browser modules.
- Do not silence type errors with broad casts. Narrow types close to the source.

Reference:

- https://github.com/andredesousa/typescript-best-practices

## Framework recommendation

Frontend recommendation:

- Use Vite with TypeScript first.
- Start with vanilla TypeScript modules or a lightweight component layer.
- Move to React only if UI state/rendering becomes the primary complexity.

Why not jump straight to React:

- The hard part of this project is image/OCR/matching logic, not reusable UI components.
- A framework rewrite plus TypeScript migration would create too many moving parts at once.
- Vite can compile TypeScript, bundle modules, serve assets, and keep the current UI mostly intact during migration.

Backend recommendation:

- Do not add NestJS yet.
- Current backend need is static serving only.
- Add NestJS later if the project needs real APIs, persistence, authentication, background jobs, uploaded image processing on the server, or multi-user storage.

If a real backend becomes useful, recommended NestJS structure:

```text
server/
  src/
    app.module.ts
    analysis/
      analysis.controller.ts
      analysis.service.ts
      dto/
    assets/
    health/
```

NestJS is a good future option because it is TypeScript-first, modular, and has dependency injection, but it is unnecessary until there is backend behavior to own.

Sources:

- https://docs.nestjs.com/v10
- https://nestjs.com/
- https://vite.dev/guide/

## Suggested migration phases

Phase 1: Documentation and safety

- Keep checkpoint commits before structural changes.
- Keep change notes under `changes/`.
- Add this architecture reference.

Phase 2: TypeScript-ready build without behavior change

- Add Vite and TypeScript configuration.
- Move browser entry from `app.js` to `src/main.ts`.
- Keep `index.html` and CSS behavior equivalent.
- Do not introduce React/NestJS in this phase.

Phase 3: Extract pure modules

- Extract OCR digit templates and matching into `src/domain/ocr/`.
- Extract image/canvas helpers into `src/infrastructure/image-processing/`.
- Extract artefact matching into `src/domain/artefacts/`.
- Add focused tests for OCR and matching helpers.

Phase 4: Extract application use cases

- Create `analyzeScreenshot`, `calculateMaterials`, and `exportAnalysis`.
- Keep UI handlers thin.

Phase 5: Improve presentation structure

- Split table rendering, OCR debug rendering, correction menus, tabs, and summary cards.
- Decide whether vanilla TypeScript remains enough or React would now pay for itself.

Phase 6: Backend decision

- Stay static if all data remains local.
- Consider NestJS only when persistent storage, upload APIs, server-side analysis, or multi-user workflows are needed.

## Approval rule for future work

Ask before these big changes:

- Adding Vite/TypeScript dependencies.
- Moving `app.js` into `src/`.
- Introducing React, Vue, Svelte, or another frontend framework.
- Introducing NestJS or any backend framework.
- Changing the data format in `data/*.json`.
- Replacing the OCR algorithm rather than refactoring it.
