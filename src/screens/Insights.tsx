import { cardAt, cardShort, selfLocators } from "../stack";
import { isMnemonica } from "../stacks";
import { Ornament } from "../components/Ornament";
import { PlayingCard } from "../components/PlayingCard";

export function Insights({ onBack, onSetup }: { onBack: () => void; onSetup: () => void }) {
  const locators = selfLocators();
  const crimp18 = cardAt(18);
  const crimp35 = cardAt(35);
  const top = cardShort(cardAt(1));
  const bottom = cardShort(cardAt(52));
  const mnemonica = isMnemonica();

  const locatorWord =
    locators.length === 0 ? "No" : locators.length === 1 ? "One" : numberWord(locators.length);

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
        <h2 className="section-title">
          {locatorWord} self-locating card{locators.length === 1 ? "" : "s"}
        </h2>
        {locators.length > 0 ? (
          <>
            <p className="setup-text">
              {locators.length === 1 ? "This card sits" : "These sit"} on their own number — the rank
              tells you the position directly, so there's no peg or link to learn.
            </p>
            <div className="insight-cards">
              {locators.map(({ card, pos }) => (
                <div key={card} className="insight-card">
                  <PlayingCard card={card} size="small" />
                  <span className="insight-card-pos">position {pos}</span>
                </div>
              ))}
            </div>
            <p className="setup-caveat">
              Why so few? A card's rank value runs A=1 up to K=13, so rank can <em>only</em> equal
              position within the first 13 slots — beyond 13, no card's rank can reach. Of those, just{" "}
              {locators.map((l) => cardShort(l.card)).join(", ")} land on their own number.
            </p>
          </>
        ) : (
          <p className="setup-text">
            None of this stack's cards land on their own number (rank value equal to position) in the
            first 13 slots — so there are no "freebies" here.
          </p>
        )}
      </section>

      <Ornament />

      <section className="setup-section">
        <h2 className="section-title">The crimp landmarks</h2>
        <p className="setup-text">
          Crimp the two cards near the quarter points — <strong>{cardShort(crimp18)} at 18</strong>{" "}
          and <strong>{cardShort(crimp35)} at 35</strong>. With the free top ({top}) and bottom (
          {bottom}), they divide the deck so no card is ever more than 9 from an anchor — a fast count
          to any selection.
        </p>
        <div className="insight-cards">
          <div className="insight-card">
            <PlayingCard card={crimp18} size="small" />
            <span className="insight-card-pos">position 18</span>
          </div>
          <div className="insight-card">
            <PlayingCard card={crimp35} size="small" />
            <span className="insight-card-pos">position 35</span>
          </div>
        </div>
        {mnemonica && (
          <p className="setup-caveat">
            Faro fact: after one out-faro the two crimped Kings <strong>swap positions</strong> (18 ↔
            35), which lets you track them through a genuine-looking shuffle. (Eight out-faros return
            the whole deck to stack order.)
          </p>
        )}
      </section>

      {mnemonica && (
        <>
          <Ornament />

          <section className="setup-section">
            <h2 className="section-title">The faro fingerprint</h2>
            <p className="setup-text">
              The stack is assembled by faro-shuffling ordered blocks of each suit, which leaves a
              regular spacing behind. Read <strong>every 3rd card from position 2 to 23</strong> and
              you hit eight hearts in a row — 2, 5, 8, 11, 14, 17, 20, 23. Clubs do the same at 24,
              27, 30, 33, 36.
            </p>
            <p className="setup-text">
              That regular weave is exactly why you can build the stack from a brand-new deck with
              faros or the{" "}
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
              they're pieces to learn from <em>Mnemonica</em> the book, not shortcuts hiding in the
              order.
            </p>
            <p className="setup-caveat">
              Worth knowing: the raw stack is <strong>not</strong> a stay-stack — it isn't
              mirror-symmetric, so there's no symmetry trick for memorising it. (The book converts it
              to one with a separate procedure.)
            </p>
          </section>
        </>
      )}
    </div>
  );
}

function numberWord(n: number): string {
  return ["Zero", "One", "Two", "Three", "Four", "Five", "Six"][n] ?? String(n);
}
