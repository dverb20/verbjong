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

## Rules notes & simplifications

- A final hand is validated by combining a player's concealed tiles with every
  exposed tile into one 14-tile rack and running the matcher — equivalent to the
  real rules for legality, and it lets jokers settle optimally.
- To call a discard for an exposure you must hold **>= 2 natural matches**; jokers
  may pad the group up to kong/quint size.
- Concealed-category hands can only be won with no exposures.
- Scoring adds the most common bonuses (jokerless, self-pick, concealed) on top of
  the hand's base points.

## License / disclaimer

Verbjong is an independent practice tool. It is not affiliated with or endorsed by
the National Mah Jongg League, and it does not reproduce their copyrighted card.
