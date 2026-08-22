# KQM-Standard Genshin Team DPS Calculator

Locally-run team DPS calculator enforcing the KQM Calculation Standard
(KQMS) for artifact substats. See `kqm-dps-calculator-prompt.md` for the
full spec this was built against.

## Run

```bash
npm install
npm run dev
```

Then open the printed `localhost` URL. Everything runs client-side —
no backend, no accounts. State autosaves to `localStorage`; use the
Export/Import buttons to save or share a build as a JSON file.

## Before trusting the numbers

All KQMS scalars, reaction coefficients, and the level-multiplier table
live in `src/constants.ts` with comments marking which values to
sanity-check against a current theorycrafting reference.
