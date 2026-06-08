# Verbjong

A mobile-first, fully client-side **American Mahjong (NMJL-style)** practice app.
Play solo against three bots, level up your skills, and study hands — all in the
browser, no backend.

> **About the card / copyright.** The National Mah Jongg League's annual cards are
> copyrighted compilations. Verbjong does **not** ship the official NMJL hands.
> It includes an **original demo card** (our own hands) so the game is playable
> immediately, plus a **Card Editor** where you can enter the hands from a card you
> personally own. Your edits are stored locally in your browser.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into dist/
npm test         # engine + full-game simulation tests
```

The build is a static client-side bundle — open `dist/index.html` from any static
host or `npm run preview`.

## What's in the box

- **Years 2021–2026** selectable. Each year is backed by an editable card (the demo
  card by default; the Year-category hands use that year's digits).
- **Full rules:** the Charleston (with the option to stop after the first round),
  drawing/discarding, **calling a discard** to make an exposure (pung / kong /
  quint), **jokers** (in groups of 3+ only) and **joker exchange**, and Mahjong by
  self-draw or off a discard.
- **Three bot difficulties** — Easy (loose, beatable), Medium (solid greedy play),
  Hard (sharper + defensive discarding) — plus a scaffolded **AI (LLM)** option.
- **Card Viewer** (browse hands, colour-coded by the suit rule), **Card Editor**
  (JSON import/export per year), and a **Stats** screen tracking your progress with
  post-game coaching ("you were N tiles from hand X").

## Architecture

Everything is plain React + a pure, framework-agnostic engine.

```
src/
  engine/
    tiles.ts       152-tile set, wall, shuffle, deal (14/13/13/13)
    cardSchema.ts  the Hand / Group pattern types
    matcher.ts     CORE: match a rack to a hand + "tiles-short" distance
    game.ts        pure game state machine (Charleston, turns, calls, joker swap, win)
    scoring.ts     base points + jokerless / self-pick / concealed bonuses
  bots/
    strategy.ts    HeuristicBot (Easy/Medium/Hard), all sharing the matcher distance
    llmBot.ts      scaffold: builds the JSON context + action schema (heuristic fallback)
  data/
    demoCard.ts    the original (non-NMJL) practice card
    cards.ts       year slots + localStorage overrides
    stats.ts       progress tracking
  state/store.ts   Zustand store + orchestrator (drives bots & the call window)
  components/       Home, GameTable, CardViewer, CardEditor, StatsScreen, Tile, HandPattern
tests/             tiles, matcher, game, full-game simulation
```

### The matcher (the heart)

`matcher.ts` answers one question — *how close is this rack to this hand?* — and
that single number drives **both** win detection and **all** bot strategy. NMJL
hands are patterns with free variables; the matcher searches:

1. the base number `n` for runs / like-numbers (`numberRef`: `n`, `n+1`, …), and
2. which concrete suits the abstract labels `A`/`B`/`C` map to (distinct labels →
   distinct suits — this is the card's "how many suits" colour rule).

Dragons are colour-bound to their group's suit, soap = white dragon, the digit `0`
in a Year hand = soap, and **jokers** may fill any slot in a group of 3+ (never a
single or pair). It returns `{ isComplete, tilesShort }`.

### Card schema

A `Hand` is an ordered list of `Group`s plus metadata:

```ts
type Group = {
  count: number;                 // 1 single · 2 pair · 3 pung · 4 kong · 5 quint
  role: 'number'|'flower'|'dragon'|'soap'|'wind'|'yearDigit';
  suitRef?: 'A'|'B'|'C';         // same label = same suit, different = must differ
  numberRef?: number | 'n'|'n+1'|'n+2'|'n+3';
  wind?: 'N'|'E'|'S'|'W';
  dragon?: 'red'|'green'|'white';
  digit?: number;                // for yearDigit (0 -> soap)
};
type Hand = {
  id; category; name; groups: Group[];
  distinctSuits: number; concealed: boolean; points: number; note?;
};
```

Every hand must total 14 tiles (the Editor flags any that don't). Jokers are
*derived* as legal in any group with `count >= 3`.

### LLM bot (scaffolded, not wired)

`bots/llmBot.ts` defines the integration shape without making network calls:

- `buildLlmContext(state, seat)` serialises everything the bot is *allowed* to know
  — its own concealed tiles, all public exposures, the discard pile, the card's
  hands annotated with the matcher's distance, and the legal actions.
- `LlmAction` is the JSON the model must return (`discard` / `call_exposure` /
  `call_mahjong` / `pass` / `charleston_pass`), validated against the engine before
  use, with the heuristic bot as a fallback.

When implemented it will call the **Anthropic Messages API** with tool-use
(structured output) for a guaranteed-valid JSON action, using a user-supplied API
key stored locally. Nothing in this build performs network requests.

## Rules notes (validated against NMJL rules)

Enforced by the engine:

- 152 tiles; 13/13/13/14 deal; East discards first.
- **Charleston:** right/across/left then (optional) left/across/right; **jokers may
  never be passed** (enforced for bots and the human picker).
- **Calling a discard:** only for a pung/kong/quint (3+), never a pair; you must
  hold at least **one real matching tile** (a joker may fill the rest); a **joker
  discard can't be claimed**.
- **Exposures must fit the card:** all of a player's exposures must map to distinct
  groups of a single hand under one consistent suit/run assignment, so you can't
  build a dead hand (e.g. 3s and 5s in different suits).
- **Jokers** are legal only in groups of 3+, never a single or pair.
- **Joker redemption:** swap a joker out of any exposure (yours or others') for the
  real tile, but only on your turn once you hold 14 tiles (after drawing/claiming).
- Win = a 14-tile hand on the card; concealed-category hands require no exposures;
  Mahjong claims beat exposure claims.
- A final hand is validated by combining concealed + exposed tiles into one 14-tile
  rack and running the matcher (lets jokers settle optimally).

Known simplifications (not glitches — planned/optional):

- No Charleston **blind pass** or **courtesy pass** yet.
- Exposures cap at a **quint (5)**; sextets aren't supported (the demo card needs
  none).
- You can't yet **add a discard to an existing exposed pung** to promote it to a
  kong (expose the full group at once instead).
- No wrong-call **penalty/dead-hand** scoring — the UI simply prevents illegal moves.
- Single hand per game (no East rotation / running score); "Play again" re-deals.
- Scoring adds the common bonuses (jokerless, self-pick, concealed) on the base.

## License / disclaimer

Verbjong is an independent practice tool. It is not affiliated with or endorsed by
the National Mah Jongg League, and it does not reproduce their copyrighted card.
