# Build Prompt: KQM-Standard Genshin Team DPS Calculator

Paste everything below into Claude Code as your build instructions. It is written to be unambiguous — implement exactly what is specified, and where a value must be verified, verify it rather than guessing.

---

## 1. Goal

Build a **locally-run** web app that calculates **total team-wide damage and DPS** for a Genshin Impact rotation, in the style of a serious theorycrafter's spreadsheet (Zajef-style), enforcing the **KQM Calculation Standard (KQMS)** for artifact substats. This is a tool for a guide-maker who needs conclusive, auditable, math-grounded numbers — accuracy and transparency of the breakdown matter more than visual flash.

It is **not** a build optimizer and **not** a gameplay simulator. It does not compute action timings or energy. The user builds a rotation as an explicit ordered list of damage instances and controls which buffs apply to each.

## 2. Tech stack & setup

- **React + TypeScript + Vite.** Runs locally via `npm install` then `npm run dev`. No deployment, no backend, no accounts.
- Use **`genshin-db`** (npm package) as the bundled data source. It ships all character/weapon/talent/constellation/artifact data offline and exposes functions to compute base stats at any level. Import it directly; do not scrape any website and do not call remote APIs.
- Suggested state management: a single store (Zustand is fine) holding the team, rotation, buffs, and enemy config. Keep all numeric constants in **one `constants.ts`** file (see §9).
- Persistence: **autosave the full app state to `localStorage`**, plus **explicit JSON export/import** buttons so builds can be saved as files and shared. (This runs locally, not as a sandboxed artifact, so `localStorage` is available.)
- UI priority: dense, legible, numeric. Tables and editable number fields over decorative styling. Every computed number must be traceable to its inputs.

## 3. The damage formula (implement exactly)

For each **damage instance** (one row in the rotation), compute:

```
BaseDMG   = TalentMV × ScalingStat + FlatBaseAdd + AdditiveReactionBase
Hit       = BaseDMG
          × (1 + TotalDMGBonus%)
          × CritMultiplier
          × DEFMultiplier
          × RESMultiplier
          × AmplifyingMultiplier
```

- **ScalingStat** is selectable per instance: Total ATK, Total HP, Total DEF, or Total EM (some talents scale off HP/DEF/EM).
- **Total ATK** = `BaseATK × (1 + ATK%) + FlatATK`. Base ATK = character base (from genshin-db at lvl 90) + weapon base ATK. Same additive pattern for Total HP and Total DEF. Total EM is a flat pool.
- **TotalDMGBonus%** = sum of elemental DMG% (matching the instance's element) + all-element/any DMG% + talent-specific DMG% + generic DMG% buffs active on this hit.
- **CritMultiplier** — controlled by a global toggle with three modes:
  - Average (default): `1 + clamp(CritRate, 0, 1) × CritDMG`
  - On-crit: `1 + CritDMG`
  - Non-crit: `1`
- **DEFMultiplier** = `(CharLvl + 100) / ((CharLvl + 100) + (EnemyLvl + 100) × (1 − DefReduction) × (1 − DefIgnore))`. CharLvl defaults 90, EnemyLvl defaults 100.
- **RESMultiplier**, where `RES = EnemyBaseRES − ResShred` (EnemyBaseRES defaults 0.10):
  - `RES < 0`  → `1 − RES/2`
  - `0 ≤ RES < 0.75` → `1 − RES`
  - `RES ≥ 0.75` → `1 / (1 + 4 × RES)`
- **AmplifyingMultiplier** = `1` for non-amplified hits. For vaporize/melt: `AmpBase × (1 + AmpEMBonus + ReactionBonus%)`.

**Reactions** (all editable coefficients — see §9):

- **Amplifying (Vaporize / Melt):** applied as the final multiplier above.
  - `AmpBase` = 2.0 or 1.5 depending on direction: Vape = 2.0 when Hydro triggers on Pyro, 1.5 when Pyro on Hydro; Melt = 2.0 when Pyro on Cryo, 1.5 when Cryo on Pyro. Let the user pick the direction per instance.
  - `AmpEMBonus = 2.78 × EM / (EM + 1400)`.
- **Additive (Aggravate / Spread):** adds to `AdditiveReactionBase` **inside** BaseDMG, so it benefits from DMG%, crit, DEF and RES.
  - `AdditiveReactionBase = ReactionCoef × LevelMultiplier × (1 + AddEMBonus + ReactionBonus%)`.
  - `ReactionCoef` = 1.15 (Aggravate, on Electro triggers) or 1.25 (Spread, on Dendro triggers).
  - `AddEMBonus = 5 × EM / (EM + 1200)`.
- **Transformative (Overload, Superconduct, Electro-Charged, Swirl, Shatter, Bloom, Hyperbloom, Burgeon, Burning):** computed as a **separate, standalone instance type** with its own formula — no talent multiplier, no DMG%, and no crit by default (crit is a rare special case; leave it off unless a toggle is set).
  - `TransDMG = ReactionCoef × LevelMultiplier × (1 + TransEMBonus + ReactionBonus%) × RESMultiplier`.
  - `TransEMBonus = 16 × EM / (EM + 2000)`.
  - Standard coefficients (verify in §9): Overload 2.0, Superconduct 0.5, Electro-Charged 1.2, Swirl 0.6, Shatter 1.5, Bloom/Hyperbloom/Burgeon 2.0/3.0/3.0, Burning 0.25 per tick.
- `LevelMultiplier` comes from the reaction Level-Multiplier table indexed by character level. At level 90 it is approximately **1446.85**. Embed the standard table (or at least the lvl-90 value) in `constants.ts` and mark it for verification.

> Implementer note: because all buckets are multiplicative, multiplication order does not affect the result — but keep the structure above so the per-instance breakdown is readable.

## 4. Units (team members)

Support up to 4 units. For each unit:

- **Character** — searchable dropdown backed by `genshin-db` (roster stays current when the package is updated; the tool must not hardcode a fixed roster). Auto-fill base HP/ATK/DEF at **level 90** and the character's ascension stat.
- **Weapon** — dropdown from `genshin-db`: auto-fill base ATK at **level 90** and the secondary stat. Weapon **passives** are entered as manual buffs (§6) — do not try to auto-parse every passive; genshin-db gives descriptions, not clean numeric uptimes.
- **Constellation** and **talent levels** — default C0 and talents **9/9/9**. Editable.
- **Talent motion values** — pull genshin-db's talent multiplier arrays as **best-effort suggestions**, but always let the user override the MV for any instance. genshin-db returns raw parameter arrays, so surface them as a reference next to a freely-editable field rather than trusting an automatic mapping.
- **Artifacts** — main stats + KQM substats (§5), plus artifact-set bonuses entered as manual buffs (§6).

The unit's final stat sheet (Total ATK/HP/DEF/EM, Crit Rate, Crit DMG, ER, elemental DMG%, etc.) is the sum of: character base, weapon, artifact main stats, KQM substats, and any **always-on** buffs. Partial-uptime buffs do **not** fold into the base sheet — they apply per instance (§6).

## 5. KQM artifact substats (enforced)

Implement the KQMS substat model with a **+/− stepper UI** that hard-blocks illegal states with a clear inline message (never silently clamp).

- The user selects the 3 variable main stats: **Sands, Goblet, Circlet**. Flower is fixed **HP**, Feather is fixed **ATK**. All 5 pieces are max level; apply their main-stat values.
- There are **10 substat types**: HP%, flat HP, ATK%, flat ATK, DEF%, flat DEF, EM, Crit Rate, Crit DMG, Energy Recharge.
- **20 fixed rolls:** every substat type receives **exactly 2 rolls** automatically.
- **20 distributed rolls:** the user allocates these with the steppers, subject to:
  - **Total distributed = exactly 20** (block over/under; show remaining count).
  - **Per-substat cap** = `2 × (number of the 5 pieces whose main stat ≠ that substat type)`. Compute this live from the chosen main stats. (Example: if Circlet is Crit Rate, Crit Rate can take at most `2 × 4 = 8` distributed rolls; Crit DMG, on no piece's main stat, can take `2 × 5 = 10`. This reproduces the 8-CR / 10-CD pattern in the KQM example.)
- **Roll values (5★ scalars)** — use these exact per-roll values in `constants.ts`:
  `HP% 4.96, flatHP 253.94, ATK% 4.96, flatATK 16.54, DEF% 6.20, flatDEF 19.68, EM 19.82, CritRate 3.31, CritDMG 6.62, ER 5.51`. A stat's total from subs = `(fixed + distributed rolls) × scalar`.
- **Rarity mix (advanced, optional, default all-5★):** allow marking pieces as 4★. A 4★ piece applies a **0.8× stat modifier** and a **−2 distributed-roll penalty**. Implement the KQMS rarity-mix averaging: effective scalar = 5★ scalar × `(count5★ × 1 + count4★ × 0.8) / 5`. Keep this behind an "advanced" toggle so the default flow stays simple.

## 6. Buffs (the core mechanic)

A buff modifies stats or damage. Each buff has:

- **Effect** — one or more of: ATK% / flat ATK / HP% / DEF% / EM / Crit Rate / Crit DMG / elemental or all DMG% / talent-specific DMG% / Reaction Bonus% (feeds the reaction EM-parentheticals, not regular DMG%) / RES shred / DEF reduction / DEF ignore / flat additive base damage.
- **Scope** — which units and/or which ability categories (Normal/Charged/Plunge/Skill/Burst/reaction) it can apply to.
- **Uptime mode** — chosen per buff:
  1. **Always-on** — folds into the base stat sheet (§4). Use for permanent passives and set bonuses.
  2. **Per-hit toggle** — the buff appears as a checkbox on every eligible instance in the rotation; the user ticks exactly the hits it covers. This is the exact method: it handles snapshotting (flag the snapshotted instances as on) and uneven overlap between buffs correctly.
  3. **Fractional uptime** — the user enters a fraction (e.g. `2/3`), applied as `effectValue × fraction` to eligible instances. This is exact for a single additive-bucket buff (ATK%, DMG%, flat) on a uniform rotation, and a fast approximation otherwise.

Show a small inline caution on **fractional uptime** for crit-type effects or when multiple fractional buffs overlap, noting the result is approximate there and per-hit toggling is exact — but never block it; the user knows the tradeoff.

## 7. Rotation & damage instances

The rotation is an **ordered list of damage instances**. Each instance has: source unit, label/ability tag, ability category, element, scaling stat, MV (editable, genshin-db suggestion beside it), number of hits/ticks, reaction type (none / amplifying+direction / additive / transformative), and the per-hit buff toggles for every eligible per-hit buff.

Transformative reactions are added as their own instance type (§3).

The user enters a single **rotation duration in seconds** (required — KQM mandates stating rotation length). This drives DPS.

## 8. Output

- **Per-instance breakdown table:** for each instance show BaseDMG, the value of each multiplier bucket, and final damage (average-crit by default; also expose non-crit and on-crit). This table is the auditable core — make it copyable.
- **Per-unit subtotals** and **team total damage**.
- **Team DPS** = team total damage ÷ rotation duration.
- A compact **assumptions header** restating the KQM deviations the standard requires be declared: enemy level & RES, rotation length, reaction/buff uptimes used, weapon passive uptimes, constellations. This makes outputs guide-ready.

## 9. Constants file (verify before trusting)

Put all of these in `constants.ts` with the standard values pre-filled and a comment block telling the user to sanity-check them against a current theorycrafting reference:

- KQM 5★ (and 4★) substat scalars (§5).
- Reaction coefficients (amplifying bases, aggravate/spread coefs, transformative coefs) (§3).
- EM formula constants: amplifying `2.78 / +1400`, transformative `16 / +2000`, additive `5 / +1200`.
- Reaction Level-Multiplier table by character level (lvl 90 ≈ 1446.85).
- Default enemy: level 100, 10% universal RES.

Do **not** silently trust remembered coefficients in code paths — read them from this file so the user can correct any single number in one place.

## 10. Explicitly out of scope

- Energy / Energy Recharge feasibility. Damage only.
- Action timing, animation frames, hitlag, swap delays (no auto-timeline).
- Build optimization / artifact farming simulation.
- Side-by-side comparison mode and mobile-responsive layout (not needed).

## 11. Build order (suggested)

1. Scaffold Vite + React + TS; add `genshin-db`; wire the store and localStorage autosave.
2. `constants.ts` and the pure damage-formula functions (§3) with unit tests on a hand-checked example.
3. Unit stat sheet from genshin-db (character + weapon + main stats).
4. KQM substat allocator with enforcement (§5).
5. Buff system with the three uptime modes (§6).
6. Rotation builder + per-hit toggles (§7).
7. Output tables, team DPS, assumptions header (§8).
8. JSON export/import.

Start by confirming the damage-formula functions produce a correct number for one fully worked hand example before building UI on top.
