import { Ornament } from "../components/Ornament";
import { isMnemonica } from "../stacks";

// Right column, top -> bottom, is labelled 4, 1, 2, 3.
const ANCHOR_LABELS = [4, 1, 2, 3];

function PileGrid() {
  const cells = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const isAnchor = c === 3;
      // Anchor 1 sits second from the top, at (row 1, col 3). Its down-left
      // diagonal runs off the bottom edge and wraps to the top-left — the broken
      // diagonal where (row + col) % 4 === 0. The glow traces that pickup path.
      const inGroupOne = (r + c) % 4 === 0;
      cells.push(
        <div
          key={`${r}-${c}`}
          className={`pile-cell ${isAnchor ? "is-anchor" : ""} ${inGroupOne ? "is-diag" : ""}`}
          style={inGroupOne ? { animationDelay: `${((r - 1 + 4) % 4) * 0.35}s` } : undefined}
        >
          {isAnchor ? <span className="pile-num">{ANCHOR_LABELS[r]}</span> : null}
        </div>,
      );
    }
  }
  return (
    <div className="pile-visual">
      <div className="pile-grid">{cells}</div>
      <span className="pile-caption">
        16 piles, 4×4. The right column holds your anchors — top→bottom they read 4, 1, 2, 3. Work
        them in number order (1 first), each down the ↙ diagonal, wrapping to the top-left. The glow
        traces anchor 1.
      </span>
    </div>
  );
}

export function Setup({ onBack }: { onBack: () => void }) {
  if (!isMnemonica()) {
    return (
      <div className="screen setup-screen">
        <div className="toolbar">
          <button type="button" className="btn-link" onClick={onBack}>
            ← Back
          </button>
          <span className="toolbar-title">Set up a deck</span>
          <span className="toolbar-spacer" />
        </div>
        <p className="setup-intro">This build-from-new-deck guide is written for the Mnemonica stack.</p>
        <p className="setup-text" style={{ textAlign: "center" }}>
          The 16-pile method produces Mnemonica specifically. To get into this stack's order, follow
          its own published setup — then the drills, reference and performance tools here all work the
          same way.
        </p>
      </div>
    );
  }

  return (
    <div className="screen setup-screen">
      <div className="toolbar">
        <button type="button" className="btn-link" onClick={onBack}>
          ← Back
        </button>
        <span className="toolbar-title">Set up a deck</span>
        <span className="toolbar-spacer" />
      </div>

      <p className="setup-intro">Get a shuffled deck into Mnemonica order.</p>

      <p className="setup-caveat">
        Which way is which: <strong>top</strong> is the card you deal first, with the deck face-down
        — that's position 1, the 4♣. <strong>Bottom</strong> is the face card at the very back —
        position 52, the 9♦.
      </p>

      <Ornament />

      <section className="setup-section">
        <h2 className="section-title">The 16-pile method</h2>
        <p className="setup-text">
          CardMechanic's no-faro route. Take it slowly — every step says whether the deck is{" "}
          <strong>face up</strong> or <strong>face down</strong>.
        </p>

        <p className="setup-phase">1 · Build the start order — face up</p>
        <ol className="setup-steps">
          <li>Take out the jokers and ad cards — 52 playing cards only.</li>
          <li>
            Hold the deck <strong>face up</strong> and deal into <strong>four face-up piles, one per
            suit</strong>. Put each pile in this order — the first card listed goes down first, each
            next card squarely on top of it:
            <ul className="setup-substeps">
              <li>♠ Spades — A, 2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K</li>
              <li>♥ Hearts — K, Q, J, 10, 9, 8, 7, 6, 5, 4, 3, 2, A</li>
              <li>♦ Diamonds — A, 2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K</li>
              <li>♣ Clubs — K, Q, J, 10, 9, 8, 7, 6, 5, 4, 3, 2, A</li>
            </ul>
          </li>
          <li>
            Stack the four piles into one, still <strong>face up</strong>: ♠ on the bottom, ♥ on top
            of it, then ♦, then ♣ on top.
          </li>
          <li>
            Turn the whole deck <strong>face down</strong>. <em>Check it's right:</em> the top card
            (first you'd deal) is the <strong>A♠</strong>; flip the deck over and the face card is
            the <strong>A♣</strong>.
          </li>
        </ol>

        <p className="setup-phase">2 · The quadruple anti-faro</p>
        <p className="setup-text">
          An anti-faro is the reverse of a faro shuffle — instead of weaving two halves together you
          un-weave them. Four of them rearrange the suits into the stack, and the 16-pile deal does
          all four in one go.
        </p>
        <ol className="setup-steps">
          <li>
            <strong>Deal face down</strong> into 16 piles in a 4×4 grid — one card at a time along
            the rows, cycling round until the deck is gone. (52 cards, so four piles get a 4th card.)
          </li>
          <li>
            Gather the piles along <strong>broken diagonals</strong>, using the right-hand column as
            your four start points.
            <PileGrid />
            <ul className="setup-substeps">
              <li>The anchors are the right column — top→bottom they read 4, 1, 2, 3. Work them in number order, 1 first.</li>
              <li>
                From an anchor, sweep <strong>down-and-left</strong>, dropping each pile onto the one
                before. When you run off the bottom-left edge, jump to the top-left corner and carry
                on down-left until that diagonal is gathered.
              </li>
              <li>Set that group down; gather anchor 2 the same way and drop it on top — then 3, then 4 on top.</li>
              <li>Square up — you're back to one deck.</li>
            </ul>
          </li>
        </ol>

        <p className="setup-phase">3 · The cuts and shuffle</p>
        <ol className="setup-steps">
          <li>
            <strong>Eight-card transfer — face down.</strong> Spread and find the two black nines (9♣
            and 9♠). Cut between them, keeping the 9♠ on top of the bottom half. Deal 8 cards one at a
            time from the top half onto the bottom half, then drop the rest of the top half on top.
          </li>
          <li>
            <strong>Klondike shuffle — face up.</strong> Turn the deck face up and cut between the 2♣
            and 3♥. Set the smaller half (the one with the 3♥) on the table. From the larger half,
            take its <strong>top and bottom card together</strong> as a pair and drop them on the
            table pile; repeat until the larger half is used up.
          </li>
          <li>
            <strong>Final cut — face up.</strong> Find the 4♣ and cut so the <strong>4♣ becomes the
            top card</strong> (position 1). That's full Mnemonica — 4♣ on top, 9♦ on the face.
          </li>
        </ol>

        <p className="setup-caveat">
          The trickiest part is the phase-2 pickup — run it slowly against the video the first time.
          And if you want certainty, ask me to simulate the whole thing in code: I can prove it lands
          on Mnemonica (and pin down the exact suit order) before you trust it on a real deck.
        </p>
      </section>

      <Ornament />

      <section className="setup-section">
        <h2 className="section-title">Or use faros</h2>
        <p className="setup-text">
          Mnemonica can also be reached from a new deck with a sequence of perfect faro shuffles — the
          same result as the pile deal, if you have the faro chops. The exact sequence is in Juan
          Tamariz's <em>Mnemonica</em>.
        </p>
      </section>
    </div>
  );
}
