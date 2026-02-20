# Project State

Last updated: 2026-02-20

## Current Phase

**Phase 2 complete** — Canvas + SVG renderers implemented. Visual testing буде при готовому UI (Phase 3).

## Installed Packages (actual versions)

### Dependencies

| Package                  | Version  | Notes                    |
| ------------------------ | -------- | ------------------------ |
| astro                    | ^5.17.1  | Framework                |
| @astrojs/react           | ^4.4.2   | React integration        |
| react                    | ^19.2.4  | UI library               |
| react-dom                | ^19.2.4  | React DOM renderer       |
| tailwindcss              | ^4.2.0   | CSS-based config (no JS) |
| @tailwindcss/vite        | ^4.2.0   | Vite plugin              |
| class-variance-authority | ^0.7.1   | Variant helpers (ShadCN) |
| clsx                     | ^2.1.1   | Class merging            |
| tailwind-merge           | ^3.5.0   | Tailwind class dedup     |
| radix-ui                 | ^1.4.3   | Primitives (ShadCN)      |
| lucide-react             | ^0.575.0 | Icons                    |

### Dev Dependencies

| Package                     | Version | Notes                 |
| --------------------------- | ------- | --------------------- |
| typescript                  | ^5.9.3  | Type system           |
| eslint                      | ^10.0.0 | Linting (flat config) |
| @eslint/js                  | ^10.0.1 | ESLint core rules     |
| typescript-eslint           | ^8.56.0 | TS ESLint parser      |
| eslint-plugin-react         | ^7.37.5 | React rules           |
| eslint-plugin-react-hooks   | ^7.0.1  | Hooks rules           |
| eslint-plugin-astro         | ^1.6.0  | Astro rules           |
| eslint-config-prettier      | ^10.1.8 | Prettier compat       |
| prettier                    | ^3.8.1  | Formatter             |
| prettier-plugin-astro       | ^0.14.1 | Astro support         |
| prettier-plugin-tailwindcss | ^0.7.2  | Class sorting         |
| vitest                      | ^4.0.18 | Test runner           |
| husky                       | ^9.1.7  | Git hooks             |
| lint-staged                 | ^16.2.7 | Pre-commit runner     |
| shadcn                      | ^3.8.5  | Component CLI         |
| tw-animate-css              | ^1.4.0  | Animation utilities   |

### ShadCN Components Installed

button, card, input, label, slider, tabs, tooltip, badge

## Architectural Decisions

| #   | Decision                | Detail                                                               | Date       |
| --- | ----------------------- | -------------------------------------------------------------------- | ---------- |
| 1   | Rendering: Canvas + SVG | Canvas for live preview (fast), SVG generated only for vector export | 2026-02-20 |

## Deviations from PRD

| #   | PRD says                           | Actual                                 | Reason                                |
| --- | ---------------------------------- | -------------------------------------- | ------------------------------------- |
| 1   | `npm create astro`                 | `yarn create astro`                    | Project uses yarn as package manager  |
| 2   | Tailwind CSS (version unspecified) | Tailwind CSS **v4** (CSS-based config) | Latest version, no tailwind.config.js |
| 3   | ShadCN style unspecified           | **new-york** (default)                 | Default during `shadcn init`          |
| 4   | ESLint version unspecified         | ESLint **v10** (flat config only)      | Latest stable, flat config enforced   |
| 5   | Primary color unspecified          | **Violet** (oklch)                     | Design choice for brand identity      |
| 6   | Dark/light mode unspecified        | Planned (`.dark` class strategy)       | Standard UX practice                  |

## Completed

- [x] Project initialization (Astro + React + TypeScript)
- [x] Tailwind CSS v4 setup
- [x] ShadCN UI initialization + base components
- [x] ESLint v10 flat config
- [x] Prettier with Astro and Tailwind plugins
- [x] Husky + lint-staged pre-commit hooks
- [x] Vitest configuration
- [x] Project documentation (PRD, CRITICAL_NOTES)
- [x] Violet theme applied
- [x] README created
- [x] Phase 1: QR engine core (GF(256), Reed-Solomon, encoder, analyzer, interleaver, matrix, placer, masker, format)
- [x] Phase 2: Canvas renderer (live preview) + SVG renderer (vector export) — візуальне тестування при готовому UI

## Next Up

- [ ] Phase 3: React UI (controls, live preview, state management)
- [ ] Phase 4: Export (PNG, SVG, clipboard) and polish

## Known TODOs / Tech Debt

- Dark/light theme toggle component not yet implemented
- No favicon or meta tags configured
- No CI/CD pipeline
