import { useState } from "react";
import { generateSyncCode, syncConfigured } from "../sync";
import { Ornament } from "../components/Ornament";

export function Sync({
  syncCode,
  status,
  onConnect,
  onDisconnect,
  onSyncNow,
  onPush,
  onPull,
  onBack,
  embedded = false,
}: {
  syncCode: string;
  status: { busy: boolean; message: string };
  onConnect: (code: string) => void;
  onDisconnect: () => void;
  onSyncNow: () => void;
  onPush: () => void;
  onPull: () => void;
  onBack?: () => void;
  embedded?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const configured = syncConfigured();
  const connected = syncCode !== "";

  return (
    <div className={embedded ? "sync-embedded" : "screen sync-screen"}>
      {!embedded && (
        <div className="toolbar">
          <button type="button" className="btn-link" onClick={onBack}>
            ← Back
          </button>
          <span className="toolbar-title">Cloud sync</span>
          <span className="toolbar-spacer" />
        </div>
      )}

      {!configured ? (
        <>
          <p className="setup-intro">Cloud sync isn't switched on in this build yet.</p>
          <p className="setup-text" style={{ textAlign: "center" }}>
            Once the cloud project is connected, this screen will let you link your devices with a
            shared code so your progress keeps itself in step.
          </p>
        </>
      ) : !connected ? (
        <>
          <p className="setup-intro">Link your devices with one shared sync code.</p>
          <p className="setup-text" style={{ textAlign: "center" }}>
            Generate a code here, then enter the <em>same</em> code in the app on your other device.
            From then on, progress syncs automatically.
          </p>

          <label className="learn-field">
            <span className="learn-field-label">Sync code</span>
            <input
              className="learn-input"
              type="text"
              value={draft}
              placeholder="paste or generate a code"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => setDraft(e.target.value.trim())}
            />
          </label>

          <div className="sync-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setDraft(generateSyncCode())}>
              Generate
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={draft.length < 6}
              onClick={() => onConnect(draft)}
            >
              Connect
            </button>
          </div>

          {status.message && <p className="sync-status">{status.message}</p>}
        </>
      ) : (
        <>
          <p className="setup-intro">Synced.</p>
          <p className="setup-text" style={{ textAlign: "center" }}>
            Enter this same code in the app on any other device to keep them in step.
          </p>

          <div className="sync-code-box">
            <span className="learn-field-label">Your sync code</span>
            <span className="sync-code">{syncCode}</span>
          </div>

          {status.message && <p className="sync-status">{status.message}</p>}

          <button
            type="button"
            className="btn btn-primary sync-now"
            disabled={status.busy}
            onClick={onSyncNow}
          >
            {status.busy ? "Syncing…" : "Sync now"}
          </button>

          <Ornament />

          <p className="setup-text" style={{ textAlign: "center" }}>
            If the two devices ever disagree, force the direction:
          </p>
          <div className="sync-actions">
            <button type="button" className="btn btn-ghost" disabled={status.busy} onClick={onPush}>
              Push this device →
            </button>
            <button type="button" className="btn btn-ghost" disabled={status.busy} onClick={onPull}>
              ← Pull to this device
            </button>
          </div>
          <p className="sync-hint">
            Push overwrites the cloud with this device. Pull overwrites this device with the cloud.
          </p>

          <button type="button" className="btn btn-danger sync-disconnect" onClick={onDisconnect}>
            Turn off sync here
          </button>
        </>
      )}
    </div>
  );
}
