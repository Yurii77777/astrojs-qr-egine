# AI Instructions — QR Engine Project

Detailed PRD and architecture: `src/docs/prd/QR_ENGINE_PRD.md`
Edge cases, traps, module-level notes: `src/docs/CRITICAL_NOTES.md` — читати перед реалізацією кожного файлу.

---

## Astro

- Pages live in `src/pages/`. File name = route.
- React islands: add `client:load` (immediate) or `client:visible` (lazy) directive.
- No `client:*` = static HTML, no JS shipped.
- Shared layout: `src/layouts/`, import in page frontmatter.
- Static assets: `public/` (served as-is). Processed assets: `src/assets/`.
- Config: `astro.config.mjs` — integrations declared here (react, tailwind).

## React + TypeScript

- Prefer `function` declarations for components, not arrow functions.
- Type props inline: `function Foo({ bar }: { bar: string })`.
- `useMemo` for expensive pure computations (QR matrix, SVG string).
- `useCallback` only when passing stable refs to child deps.
- Debounce text input at 150ms before triggering QR generation.
- No class components. No `any` — use `unknown` + type guard instead.
- State shape in one `useReducer` when >3 related fields.

## Tailwind CSS

- Utility-first: no custom CSS unless Tailwind cannot express it.
- Responsive: `sm:` `md:` `lg:` prefixes, mobile-first.
- Dark mode via `dark:` prefix (class strategy in config).
- Avoid arbitrary values `[...]` unless truly one-off.
- Group variants: `group/hover:` for parent-triggered child styles.
- `cn()` helper (from `lib/utils`) for conditional class merging.

## ShadCN UI

- Components live in `src/components/ui/` — edit freely, they are owned code.
- Add new components: `npx shadcn@latest add <name>` (never copy-paste manually).
- Use `variant` and `size` props before overriding with className.
- Compose: wrap ShadCN primitives in domain components, don't scatter ShadCN imports across pages.
- Radix UI is the primitive layer — ShadCN is just styled wrappers.

## Lucide Icons

- Import individually: `import { Download } from 'lucide-react'` (tree-shaken).
- Always set `size` and `strokeWidth` props explicitly for consistency.
- Default size: `size={16}` inline, `size={20}` standalone buttons.
- Use `aria-hidden="true"` when icon is decorative (label provided elsewhere).

## QR Engine (custom)

- Engine (`src/engine/`) has **zero DOM dependencies** — pure TypeScript.
- Pipeline is strictly sequential and each step is a pure function.
- Never modify `QRMatrix` after generation — clone before excavate/render.
- All lookup tables precomputed in `constants/` — no runtime recalculation.
- GF(256) exponents: mod **255**, not 256. `LOG[0]` = undefined — guard `gfMul` against zero inputs.
- EC level bits: **L=01 M=00 Q=11 H=10** — not numeric order 0/1/2/3.
- Dark module always present at `(4*version+9, col=8)` — never skip.
- Mask XOR applies only to data modules, never function patterns.
- Byte mode char-count width: **8 bits for v1–9, 16 bits for v10+** — hardcoding 8 silently corrupts long URLs.
- UTF-8 byte length: use `TextEncoder`, not `string.length`.
- Zigzag skips col 6 entirely; shift from col 7 → col 5.
- SVG linear gradient: use `gradientUnits="userSpaceOnUse"`, not default `objectBoundingBox`.
- Quiet zone 0 = warn user; logo > 30% area = error + force EC=H.
