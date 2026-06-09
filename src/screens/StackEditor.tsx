import { useMemo, useState } from "react";
import { parseStackCards, saveCustomStack } from "../stacks";
import { cardShort } from "../stack";
import { Ornament } from "../components/Ornament";

export function StackEditor({ onBack, onSaved }: { onBack: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");

  const parsed = useMemo(() => parseStackCards(text), [text]);
  const valid = name.trim().length > 0 && parsed.errors.length === 0 && parsed.cards.length === 52;

  function save() {
    if (!valid) return;
    const id = `custom-${Date.now().toString(36)}`;
    saveCustomStack({ id, name: name.trim(), author: author.trim() || "Custom", cards: parsed.cards });
    onSaved();
  }

  return (
    <div className="screen stack-editor-screen">
      <div className="toolbar">
        <button type="button" className="btn-link" onClick={onBack}>
          ← Back
        </button>
        <span className="toolbar-title">New stack</span>
        <span className="toolbar-spacer" />
      </div>

      <p className="setup-intro">
        Add any memorised stack. It gets its own progress, drills and reference — nothing here
        touches your other stacks.
      </p>

      <label className="learn-field">
        <span className="learn-field-label">Stack name</span>
        <input
          className="learn-input"
          type="text"
          value={name}
          placeholder="e.g. Redford"
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <label className="learn-field">
        <span className="learn-field-label">Creator (optional)</span>
        <input
          className="learn-input"
          type="text"
          value={author}
          placeholder="who devised it"
          onChange={(e) => setAuthor(e.target.value)}
        />
      </label>

      <label className="learn-field">
        <span className="learn-field-label">
          The 52 cards, position 1 (top) → 52, separated by spaces or commas
        </span>
        <textarea
          className="learn-input stack-paste"
          value={text}
          placeholder={"e.g.  4C 2H 7D 3C 4H 6D AS 5H 9S 2S QH 3D …\n(10C or TC both work)"}
          rows={6}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => setText(e.target.value)}
        />
      </label>

      <div className={`stack-parse-status ${parsed.errors.length ? "has-errors" : ""}`}>
        {text.trim() === "" ? (
          <span>Paste or type the order to check it.</span>
        ) : parsed.errors.length > 0 ? (
          <ul className="stack-parse-errors">
            {parsed.errors.slice(0, 5).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
            {parsed.errors.length > 5 && <li>…and {parsed.errors.length - 5} more</li>}
          </ul>
        ) : (
          <span>✓ All 52 cards, no duplicates.</span>
        )}
      </div>

      {parsed.cards.length > 0 && parsed.errors.length === 0 && (
        <>
          <Ornament />
          <div className="stack-preview">
            {parsed.cards.map((c, i) => (
              <span key={c} className="stack-preview-cell">
                <em>{i + 1}</em> {cardShort(c)}
              </span>
            ))}
          </div>
        </>
      )}

      <button type="button" className="btn btn-primary session-begin" disabled={!valid} onClick={save}>
        Save stack
      </button>
    </div>
  );
}
