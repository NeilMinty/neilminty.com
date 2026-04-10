# neilminty-site — Claude Code conventions

## Stack
- React 18, TypeScript, Vite 5, React Router v6, Tailwind CSS v3
- Plus Jakarta Sans font, slate colour palette, `#FAFAF9` background
- Fixed 56px NavBar (`h-14`), `max-w-5xl` page container
- Custom Tailwind token: `shadow-card` = `0 1px 3px rgba(0,0,0,0.06)`
- Vitest with `@vitest/coverage-v8`, 80% line/function thresholds

## Architecture

### Tools
Each tool follows the same five-file pattern:

| File | Purpose |
|------|---------|
| `src/logic/<name>Types.ts` | Input and result interfaces |
| `src/logic/<name>Logic.ts` | Pure calculation function — no side effects |
| `src/logic/<name>Logic.test.ts` | Unit tests for the pure function |
| `src/pages/tools/<Name>.tsx` | Two-screen state machine (input → results) |
| — | No separate hook file needed for pure tools |

Exception: First Purchase Predictor uses `src/hooks/use-analysis.ts` for its multi-row analysis logic.

### Page state pattern
All tool pages use a discriminated union:
```ts
type ViewState =
  | { view: 'input' }
  | { view: 'results'; inputs: Inputs; results: Results };
```
The input view holds a `FormState` with string fields. `toInputs()` converts to typed numbers before calling the pure function.

### Routing
Single-page app. Routes defined in `src/App.tsx`. `vercel.json` rewrites all paths to `/index.html`.

### Tool registry
`src/lib/tools.ts` is the single source of truth for tool names, descriptions, and paths. NavBar and Home both read from `TOOLS`.

## Testing conventions

### Test file location
- Logic tests: `src/logic/<name>Logic.test.ts`
- Hook tests: `src/hooks/<name>.test.ts`
- Utility tests: `src/lib/<name>.test.ts`

### Base factory pattern
Every test file defines a `base()` factory that returns valid default inputs with an optional `Partial<Inputs>` override:
```ts
function base(overrides: Partial<FooInputs> = {}): FooInputs {
  return { field: defaultValue, ...overrides };
}
```
This makes individual test cases minimal — only the field under test changes.

### Describe block structure
```
describe('core formulas', ...) — one test per output field, verifying the formula
describe('verdict/classification', ...) — threshold boundary tests
describe('edge cases — zero and extreme inputs', ...) — operator stress tests
```

### Edge case requirements
Every logic module must have an edge case block that covers:
- All inputs zero — no crash, no NaN
- Zero divisor fields — confirm guard produces 0 or Infinity as appropriate
- Extreme values (100% rates, very high money values) — no overflow or NaN
- Clamped inputs — confirm Math.min/max guards work
- NaN sweep: `Object.values(r).forEach(v => { if (typeof v === 'number') expect(isNaN(v)).toBe(false) })`

### What NOT to test
- TypeScript type definitions in `*Types.ts` files — no executable code
- `src/lib/tools.ts` — static data array
- React component rendering — no component tests in this repo

### Running tests
```bash
npm test -- --run               # single run
npm test -- --run --coverage    # with v8 coverage report
```

### Coverage notes
- `*Types.ts` files show 0% — expected, no executable code
- `tools.ts` shows 0% line coverage — expected, static data
- `use-analysis.ts` shows ~88% branch due to v8 ternary tracking artefacts — all branches are actually exercised
- Target: 100% line coverage on all `*Logic.ts` and utility files

## Component conventions
- `ToolLayout` wraps every tool page — sets `document.title` via `useEffect`
- `SectionLabel`, `ResultCard`, `InputField` are shared across all tools
- `ResultCard` variants: `positive`, `neutral`, `warning`, `critical`
- `InputField` accepts `prefix`, `suffix`, `hint`, `type` props

## Currency and formatting
- All monetary values in GBP
- `formatCurrency(value)` from `src/lib/utils.ts` — uses `en-GB` locale, always 2dp
- Input fields show `£` prefix or `%` suffix via `InputField` props
