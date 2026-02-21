# QR Engine Review - Repository-Specific Overlay

**Extends**: `.github/prompts/review-base.md`

Use the base review prompt for structure, output format, deduplication rules, and review philosophy. This overlay defines all project-specific rules, patterns, and checks.

---

## Repository Context

- **Purpose**: QR Code constructor with a custom engine (no third-party QR libraries) implementing ISO/IEC 18004
- **Tech Stack**: Astro 5, React 19, TypeScript 5.9 (strict), Tailwind CSS v4, ShadCN UI, Lucide React
- **Testing**: Vitest (unit), Playwright (e2e roundtrip decode via `@paulmillr/qr`)
- **Linting**: ESLint v10 (flat config), Prettier v3 (`prettier-plugin-astro`, `prettier-plugin-tailwindcss`)
- **Package Manager**: yarn v1.22
- **Import Alias**: `@/*` maps to `./src/*`
- **Pre-commit**: lint-staged (ESLint + Prettier) -> `tsc --noEmit` -> `vitest run`

### Architecture

```
src/engine/     — Pure TypeScript QR engine (zero DOM dependencies)
src/renderer/   — Canvas (live preview) + SVG (vector export)
src/components/ — React components (QRApp, QRControls/*, QRPreview)
src/components/ui/ — ShadCN base components (third-party, skip review)
```

### Engine Pipeline (strictly sequential, each step is a pure function)

```
Analyzer -> Encoder -> RS (Reed-Solomon) -> Interleaver ->
MatrixBuilder -> DataPlacer -> MaskEvaluator -> FormatWriter -> Renderer
```

---

## File Type Handling (Extends Base)

**ALSO REVIEW IN DETAIL:**

- Engine files (`src/engine/*.ts`) — correctness is critical for QR validity
- Renderer files (`src/renderer/*.ts`) — visual parity between Canvas and SVG
- Component files (`src/components/**/*.tsx`) — React patterns and props

**ALSO SKIP:**

- `src/components/ui/` — ShadCN-owned components, edited freely but not authored code
- `src/docs/` — project documentation
- `.astro/` — auto-generated type definitions

---

## Project Severity Rules

These map to the base prompt's generic severity tiers. Use the base definitions for general issues; use these for project-specific violations.

### 🔴 CRITICAL

<!-- prettier-ignore -->
| Rule | Why |
| --- | --- |
| `any` type usage | Must use `unknown` + type guard — `any` bypasses type checker |
| Mutating `QRMatrix` after generation | Must clone before excavate/render — shared reference corruption |
| DOM dependencies in `src/engine/` | Engine must be pure TypeScript — no `document`, `window`, `canvas` |
| Nested loops in engine/renderer | Must extract inner loop into named helper function — project rule |
| GF(256) exponents using mod 256 | Must be mod **255** — mod 256 corrupts Reed-Solomon at i=255 |
| `LOG[0]` access without guard | `gfMul` must check `a === 0 \|\| b === 0` first — LOG[0] is undefined |
| EC level bits in numeric order | **L=01, M=00, Q=11, H=10** — NOT 0/1/2/3; wrong bits = invalid QR |
| Format info bit order reversed | LSB first (`formatBits >>> i`), NOT MSB first (`formatBits >>> (14-i)`) |
| Hardcoding Byte mode count bits to 8 | Must be 8 for v1-9, **16 for v10+** — silently corrupts long URLs |
| Using `string.length` for UTF-8 byte count | Must use `TextEncoder().encode(text).length` — emoji/cyrillic = 2-4 bytes |
| SVG gradient with default `objectBoundingBox` | Must use `gradientUnits="userSpaceOnUse"` — gradient per module instead of whole code |
| Mask XOR applied to function patterns | Mask applies only to data modules, **never** function patterns |

### 🟠 HIGH

| Rule                                                      | Why                                                                  |
| --------------------------------------------------------- | -------------------------------------------------------------------- |
| Functions/computations in `constants/` files              | `constants/` is only for static data (lookup tables, literal arrays) |
| Arrow function for React component declaration            | Must use `function` declarations — project convention                |
| Class components                                          | Not allowed — function components only                               |
| Missing `useMemo` for expensive computations              | QR generation is expensive — must memoize                            |
| `useCallback` without passing to child deps               | Only use when passing stable refs to child dependencies              |
| Relative imports where `@/*` alias works                  | Must use `@/engine/*`, `@/renderer/*`, `@/components/*` etc.         |
| Custom CSS where Tailwind utility works                   | Utility-first — no custom CSS unless Tailwind cannot express it      |
| Lucide icon without explicit `size` and `strokeWidth`     | Must set both props for consistency                                  |
| Decorative icon missing `aria-hidden="true"`              | Required when label is provided elsewhere                            |
| Missing `client:load` or `client:visible` on React island | Without directive = static HTML, no JS shipped                       |
| Hardcoded QR size formula not `4 * version + 17`          | V1=21, V7=45 (NOT 49) — wrong formula = wrong matrix size            |
| Dark module missing at `(4*version+9, 8)`                 | Always present — never skip                                          |
| Zigzag not skipping column 6                              | Timing column must be skipped entirely                               |

### 🟡 MEDIUM

| Rule                                                           | Why                                                 |
| -------------------------------------------------------------- | --------------------------------------------------- |
| Arbitrary Tailwind values `[...]` used for non-one-off styling | Prefer standard utility classes                     |
| Inline props typing instead of `function Foo({ x }: { x: T })` | Project convention: type props inline               |
| ShadCN import scattered in page instead of domain component    | Compose: wrap ShadCN in domain components           |
| ShadCN component added via copy-paste instead of CLI           | Must use `npx shadcn@latest add <name>`             |
| Missing debounce on text input before QR generation            | Must debounce at 150ms                              |
| `>3` related `useState` without `useReducer`                   | Use one `useReducer` when state fields are related  |
| Logo `sizeRatio > 0.3` without error                           | Must throw error + force EC=H                       |
| Quiet zone = 0 without user warning                            | Some scanners cannot detect QR boundary             |
| Canvas gradient created per module instead of once             | Performance — create gradient once for full QR area |
| Missing High-DPI scaling in Canvas (`devicePixelRatio`)        | QR appears blurry on Retina displays                |
| SVG coordinates using fractional values                        | Must use integer `pixelSize` for crisp rendering    |

---

## Mandatory Project Patterns

### 1. Engine Purity

`src/engine/` has **zero DOM dependencies**. No `document`, `window`, `canvas`, `Image`. Only pure TypeScript.

```typescript
// CORRECT: Pure function, no side effects
export function generateQR(text: string, options: QROptions): QRMatrix;

// WRONG: DOM access in engine
const canvas = document.createElement('canvas'); // ❌ in engine/
```

**Check:** No browser globals, no side effects, each pipeline step is a pure function.

### 2. No Nested Loops

Extract inner loops into named helper functions. Each function should have one level of iteration.

```typescript
// CORRECT: Helper extracts inner iteration
function processRow(row: boolean[], rowIndex: number, size: number): void {
  for (let col = 0; col < size; col++) {
    // ...
  }
}

for (let row = 0; row < size; row++) {
  processRow(matrix[row], row, size);
}

// CORRECT: 2D traversal helper
forEachModule(modules, size, (row, col, value) => {
  // single-level callback
});

// WRONG: Nested loops
for (let row = 0; row < size; row++) {
  for (let col = 0; col < size; col++) {
    // ...
  }
}
```

### 3. React Component Conventions

```typescript
// CORRECT: function declaration, inline props typing
export function ExportPanel({
  matrix,
  renderOptions,
}: {
  matrix: QRMatrix | null;
  renderOptions: Omit<RenderOptions, 'matrix'>;
}) {
  // ...
}

// WRONG: arrow function, separate interface
interface ExportPanelProps {
  matrix: QRMatrix | null;
}
const ExportPanel: React.FC<ExportPanelProps> = ({ matrix }) => { ... };
```

**Check:** `function` declarations, inline prop types, no `React.FC`, no class components, no `any`.

### 4. Tailwind & ShadCN

```typescript
// CORRECT: Utility-first, cn() for conditional classes
import { cn } from '@/lib/utils';
<div className={cn('flex gap-2', disabled && 'opacity-50')} />

// CORRECT: ShadCN variant/size props first
<Button variant="outline" size="sm">Export</Button>

// WRONG: Custom CSS, className override before variant props
<button className="custom-button-class">Export</button>
```

### 5. Lucide Icons

```typescript
// CORRECT: Individual import, explicit size/strokeWidth, aria-hidden
import { Download } from 'lucide-react';
<Download size={16} strokeWidth={2} aria-hidden="true" />

// WRONG: Missing props, namespace import
import * as icons from 'lucide-react';
<icons.Download />
```

### 6. Renderer Parity

Canvas and SVG renderers must produce visually identical output. Shared logic lives in `renderer/shared.ts`:

- `isFinderModule()` — identify finder modules by coordinates
- `calculateDimensions()` — size calculations with quiet zone
- `excavateLogoZone()` — clone matrix before modifying
- `forEachModule()` — 2D traversal helper

**Check:** New rendering logic added to one renderer should have equivalent logic in the other.

### 7. Import Aliases

| Alias            | Example                                           |
| ---------------- | ------------------------------------------------- |
| `@/engine/*`     | `import { generateQR } from '@/engine'`           |
| `@/renderer/*`   | `import { renderSVG } from '@/renderer/svg'`      |
| `@/components/*` | `import { Button } from '@/components/ui/button'` |
| `@/lib/*`        | `import { cn } from '@/lib/utils'`                |

### 8. File Structure

- `src/engine/` — flat structure, no subdirectories for small groups (only if 5+ related files)
- `src/components/QRControls/` — domain control components
- `src/components/ui/` — ShadCN base components (skip review)
- `src/renderer/` — Canvas + SVG + shared + types

---

## QR Engine Correctness Checks

When reviewing changes to `src/engine/`, verify these domain-specific invariants:

### GF(256) Arithmetic (`gf256.ts`)

- EXP table duplicated to 512 entries (avoids explicit mod in multiplication)
- `gfMul(a, b)` guards against `a === 0 || b === 0` before accessing LOG
- Primitive polynomial: `285` (`x^8 + x^4 + x^3 + x^2 + 1`)

### Reed-Solomon (`rs.ts`)

- Generator polynomial exponents: mod **255**, not 256
- Polynomial coefficients stored high-to-low degree
- Reference: V1-M "HELLO WORLD" EC = `[196, 35, 39, 119, 235, 215, 231, 226, 93, 23]`

### Encoding (`encoder.ts`)

- Numeric: groups of 3 -> 10 bits, 2 -> 7 bits, 1 -> 4 bits
- Alphanumeric: pairs -> 11 bits, single -> 6 bits (uppercase only, 45 chars)
- Padding bytes: `0xEC, 0x11` alternating (not `0x00`)
- Byte mode character count = **bytes** (not chars)

### Matrix & Placement (`matrix.ts`, `placer.ts`)

- Dark module at `(4*version+9, 8)` — always present
- Alignment patterns skip finder overlap zones
- Zigzag: right column first in each pair, skip column 6, direction flip after each pair
- Data module count = `(totalData + totalEC) * 8 + remainderBits`

### Masking (`masker.ts`)

- 8 mask functions with correct formulas
- Penalty Rule 3: pattern `1011101` with `0000` before or after, 40 points each
- Never mutate original matrix — clone for each mask evaluation

### Format Info (`format.ts`)

- EC bits: L=01, M=00, Q=11, H=10
- BCH generator: `10100110111`
- XOR mask: `101010000010010` (0x5412)
- Bit order: LSB first (bit 0 -> position 0)
- Two identical copies written to different physical locations

---

## Test-Specific Checks

### Unit Tests (Vitest)

- Engine tests must not depend on DOM or browser APIs
- Test files: `src/engine/__tests__/*.test.ts`, `src/renderer/__tests__/*.test.ts`
- Reference values from ISO/IEC 18004 or thonky.com for known QR outputs

### E2E Tests (Playwright)

- Roundtrip decode test: `generateQR()` -> render -> decode via `@paulmillr/qr`
- Test files: `e2e/*.spec.ts`

---

## Review Workflow

1. **Scope check** - Identify changed files from PR diff. ONLY review those files
2. **Base compliance** - Deduplication, severity levels, output format
3. **Engine correctness** - GF(256), RS, format bits, zigzag (if engine files changed)
4. **Project rules** - All mandatory patterns from this overlay (applied to changed code only)
5. **Renderer parity** - If one renderer changed, check equivalent logic in the other
6. **React patterns** - Component conventions, hooks usage, props typing
7. **Tailwind/ShadCN** - Utility-first, proper composition, variant usage
