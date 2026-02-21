# QR Engine

QR Code Constructor with a custom engine built from scratch — no third-party QR generation libraries. Implements ISO/IEC 18004 standard in pure TypeScript: from Reed-Solomon encoding to SVG rendering.

## Tech Stack

- **Astro** 5.17 — static site framework
- **React** 19 — UI components (islands architecture)
- **TypeScript** 5.9 — type-safe codebase
- **Tailwind CSS** 4 — utility-first styling (CSS-based config)
- **ShadCN UI** — accessible component primitives (New York style)
- **Lucide React** — icon library
- **Vitest** 4 — unit testing
- **ESLint** 10 — linting (flat config)
- **Prettier** 3 — code formatting

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Yarn](https://classic.yarnpkg.com/) 1.x

## Getting Started

```bash
# Install dependencies
yarn install

# Start dev server
yarn dev
```

The app will be available at `http://localhost:4321`.

## Scripts

| Command             | Description              |
| ------------------- | ------------------------ |
| `yarn dev`          | Start development server |
| `yarn build`        | Build for production     |
| `yarn preview`      | Preview production build |
| `yarn test`         | Run tests (Vitest)       |
| `yarn test:watch`   | Run tests in watch mode  |
| `yarn lint`         | Lint with ESLint         |
| `yarn lint:fix`     | Lint and auto-fix        |
| `yarn format`       | Format with Prettier     |
| `yarn format:check` | Check formatting         |
| `yarn typecheck`    | TypeScript type checking |

## Project Structure

```
src/
├── components/
│   └── ui/              # ShadCN UI components (owned code, editable)
├── docs/
│   ├── prd/
│   │   └── QR_ENGINE_PRD.md   # Product Requirements Document
│   ├── CRITICAL_NOTES.md      # Edge cases and traps per module
│   └── PROJECT_STATE.md       # Current state and PRD deviations
├── engine/              # QR engine — pure TypeScript, zero DOM deps
├── hooks/               # React hooks (useQRGenerator, useExport)
├── layouts/
│   └── Layout.astro     # Shared HTML layout
├── lib/
│   └── utils.ts         # cn() helper for class merging
├── pages/
│   └── index.astro      # Main page
├── renderer/            # SVG/Canvas renderers
└── styles/
    └── global.css       # Tailwind + ShadCN theme variables
```

## Development Phases

1. **Engine core** — GF(256), Reed-Solomon, encoder, analyzer, interleaver
2. **Matrix & masking** — matrix builder, zigzag placer, mask evaluator, format info
3. **SVG renderer** — module shapes, finder styles, gradients, logo excavation
4. **React UI** — controls panel, live preview, state management
5. **Export & polish** — PNG export, capacity indicator, presets, accessibility

## CI/CD

GitHub Actions runs on every push and PR to `main`:

```
lint → format → typecheck → test → build
```

Deployment is handled automatically by the Vercel GitHub integration.

### E1. Intro. Прописуємо базові інструкції та формуємо PRD / DFA

[![E1. Intro. Прописуємо базові інструкції та формуємо PRD / DFA](https://img.youtube.com/vi/5O3YV7-Tt3o/0.jpg)](https://youtu.be/5O3YV7-Tt3o)

Telegram: https://t.me/yu_dev01
LinkedIn: https://www.linkedin.com/in/andriiko-yurii/
GitHub: https://github.com/Yurii77777/astrojs-qr-egine
