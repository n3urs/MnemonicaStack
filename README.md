# StackDrill

A local, browser-based flashcard app for memorising the **Mnemonica** stack — the 52-card
memorised deck order used in card magic. Four drill modes, weighted card selection that
quietly resurfaces your weak cards, and stats that persist across sessions.

No backend, no account, no tracking. Everything lives in your browser's `localStorage`.

## Learning from zero

Drilling alone assumes you already know the stack — it only tests recall. To actually learn
it from scratch, start in the **Learn** screen, which gives you memory hooks:

- **Position pegs (Major System):** each position 1–52 becomes a fixed image word. Digits map
  to consonant sounds (`1=t/d, 2=n, 3=m, 4=r, 5=l, 6=sh/ch/j, 7=k/g, 8=f/v, 9=p/b, 0=s/z`) and
  vowels are free, so e.g. 1 = "tie", 6 = "shoe", 32 = "moon".
- **Card images:** each card becomes an image from its suit's initial sound + its value's Major
  sound, so pip cards reconstruct themselves (`4♣ → car`, `2♥ → hen`, `A♠ → suit`). Face cards
  get a figure.
- **The link:** you memorise a card's position by picturing its peg and its image together in
  one vivid scene. Position 1 is the 4♣, so picture a **tie** wrapped around a **car**.

Every image and link is **editable in-app** — the associations that stick are the ones you make
your own, so the defaults are just a starting point. Mark a card "learned" to add it to the
drill pool. Drills only quiz cards you've learned, and spaced repetition (Leitner boxes) brings
the shaky ones back more often.

## Drill modes

- **Card → position** — see a card, recall its position (1–52). The primary mode.
- **Position → card** — see a position, recall the card that lives there.
- **Neighbours** — recall the card just before or after the one shown.
- **Sequence** — recall the card that comes next.

## Getting started

Requires Node 18 or newer.

```bash
npm install
npm run dev
```

Then open the local URL it prints (usually http://localhost:5173). It is mobile-first, so
it works well opened on your phone over your local network too.

## Build & deploy

```bash
npm run build     # type-checks, then writes a static site to dist/
npm run preview   # serve that production build locally
```

`dist/` is fully static — drop it on Vercel, Netlify, GitHub Pages, or any static host.

## How card selection works

Drills draw only from cards you've marked learned. Among those, each card is given a weight;
a higher weight means it shows up more often:

```
weight = 1 + (recent wrong answers × 2)   (+2 if seen fewer than 5 times)
unseen cards = 5
+ due today (Leitner): +4
+ lower Leitner box: up to +5
```

"Recent" means your last 10 results for that card. A correct answer bumps the card up a Leitner
box (seen less often); a wrong answer drops it back to box 1 (seen frequently). Cards you keep
missing naturally come up more often, so you don't have to flag anything manually.

## Stats

Tracked and persisted between sessions:

- Total answered and total correct (accuracy)
- Current streak and best streak ever
- Daily streak (consecutive days with at least one drill)
- Cards seen (out of 52)
- Per-card: times seen, correct, wrong, and a rolling last-10 history

Reset everything from the stats screen (with a confirmation step).

## The stack

Positions 1–52, top of deck to bottom (T = 10):

```
4C 2H 7D 3C 4H 6D AS 5H 9S 2S QH 3D QC 8H 6S 5S 9H KC 2D JH 3S 8S 6H TC 5D KD
2C 3H 8D 5C KS JD 8C TS KH JC 7S TH AD 4S 7H 4D AC 9C JS QD 7C QS TD 6C AH 9D
```

## Tech

Vite + React + TypeScript. State in `localStorage`. Single-page; screen routing is plain
`useState`, no router library.
