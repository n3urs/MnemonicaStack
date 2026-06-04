import { useState } from "react";
import { learnedCount, loadStatsFor } from "../storage";
import { STACKS } from "../stacks";
import { Ornament } from "../components/Ornament";
import { Sync } from "./Sync";
import type { SyncStatus } from "../App";

export function Settings({
  activeStackId,
  onSwitchStack,
  syncCode,
  syncStatus,
  onConnect,
  onDisconnect,
  onSyncNow,
  onPush,
  onPull,
  onBack,
}: {
  activeStackId: string;
  onSwitchStack: (id: string) => void;
  syncCode: string;
  syncStatus: SyncStatus;
  onConnect: (code: string) => void;
  onDisconnect: () => void;
  onSyncNow: () => void;
  onPush: () => void;
  onPull: () => void;
  onBack: () => void;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const activeName = STACKS.find((s) => s.id === activeStackId)?.name ?? "this stack";
  const pendingName = STACKS.find((s) => s.id === pending)?.name ?? "";

  return (
    <div className="screen settings-screen">
      <div className="toolbar">
        <button type="button" className="btn-link" onClick={onBack}>
          ← Back
        </button>
        <span className="toolbar-title">Settings</span>
        <span className="toolbar-spacer" />
      </div>

      <section className="setup-section">
        <h2 className="section-title">Stack you're learning</h2>
        <p className="setup-text">
          Each stack keeps its own separate progress — switching never touches another stack's
          learning. You're learning <strong>{activeName}</strong>.
        </p>

        <div className="stack-list">
          {STACKS.map((s) => {
            const learned = learnedCount(loadStatsFor(s.id));
            const active = s.id === activeStackId;
            return (
              <button
                key={s.id}
                type="button"
                className={`stack-row ${active ? "is-active" : ""}`}
                onClick={() => !active && setPending(s.id)}
                disabled={active}
              >
                <span className="stack-row-main">
                  <span className="stack-row-name">{s.name}</span>
                  <span className="stack-row-author">{s.author}</span>
                </span>
                <span className="stack-row-meta">
                  {active ? "Active" : `${learned}/52 learned`}
                </span>
              </button>
            );
          })}
        </div>

        {pending && (
          <div className="stack-confirm">
            <p className="confirm-text">
              Switch to <strong>{pendingName}</strong>? Your {activeName} progress stays saved —
              it'll be exactly as you left it when you switch back.
            </p>
            <div className="confirm-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setPending(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={() => onSwitchStack(pending)}>
                Switch to {pendingName}
              </button>
            </div>
          </div>
        )}
      </section>

      <Ornament />

      <section className="setup-section">
        <h2 className="section-title">Cloud sync</h2>
        <Sync
          embedded
          syncCode={syncCode}
          status={syncStatus}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
          onSyncNow={onSyncNow}
          onPush={onPush}
          onPull={onPull}
        />
      </section>
    </div>
  );
}
