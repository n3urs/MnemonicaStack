import { Ornament } from "../components/Ornament";
import { PlayingCard } from "../components/PlayingCard";

const SELF_LOCATING = [
  { card: "2H", pos: 2 },
  { card: "6D", pos: 6 },
  { card: "9S", pos: 9 },
];

export function Insights({ onBack, onSetup }: { onBack: () => void; onSetup: () => void }) {
  return (
    <div className="screen insights-screen">
      <div className="toolbar">
        <button type="button" className="btn-link" onClick={onBack}>
          ← Back
        </button>
        <span className="toolbar-title">Stack insights</span>
        <span className="toolbar-spacer" />
      </div>

      <p className="setup-intro">A few real properties of the stack — each checked against the order itself.</p>

      <Ornament />

      <section className="setup-section">
        <h2 className="section-title">Three self-locating cards</h2>
        <p className="setup-text">
          These three sit on their own number — the rank tells you the position directly, so there's
          no peg or link to learn. Three freebies.
        </p>
        <div className="insight-cards">
          {SELF_LOCATING.map(({ card, pos }) => (
            <div key={card} className="insight-card">
              <PlayingCard card={card} size="small" />
              <span className="insight-card-pos">position {pos}</span>
            </div>
          ))}
        </div>
      </section>

      <Ornament />

      <section className="setup-section">
        <h2 className="section-title">The faro fingerprint</h2>
        <p className="setup-text">
          The stack is assembled by faro-shuffling ordered blocks of each suit, which leaves a
          regular spacing behind. Read <strong>every 3rd card from position 2 to 23</strong> and you
          hit eight hearts in a row — 2, 5, 8, 11, 14, 17, 20, 23. Clubs do the same at 24, 27, 30,
          33, 36.
        </p>
        <p className="setup-text">
          That regular weave is exactly why you can build the stack from a brand-new deck with faros
          or the{" "}
          <button type="button" className="inline-link" onClick={onSetup}>
            16-pile deal
          </button>
          .
        </p>
      </section>

      <Ornament />

      <section className="setup-section">
        <h2 className="section-title">What the stack can do</h2>
        <p className="setup-text">
          Beyond naming positions, the order powers full performance pieces: poker demonstrations
          ("Super Poker", "Any Hand Called For"), bridge and blackjack deals, productions of whole
          suits, and spellings to the aces, kings, queens and jacks.
        </p>
        <p className="setup-text">
          These aren't plain deals off the top, though — they use Tamariz's specific handlings, so
          they're pieces to learn from <em>Mnemonica</em> the book, not shortcuts hiding in the order.
        </p>
        <p className="setup-caveat">
          Worth knowing: the raw stack is <strong>not</strong> a stay-stack — it isn't
          mirror-symmetric, so there's no symmetry trick for memorising it. (The book converts it to
          one with a separate procedure.)
        </p>
      </section>
    </div>
  );
}
