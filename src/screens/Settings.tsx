import { useState } from "react";
import { deleteProgressFor, learnedCount, loadAllProgress, loadStatsFor } from "../storage";
import { allStacks, deleteCustomStack, getActiveStackId, getCustomStacks, isCustomStack } from "../stacks";
import { Ornament } from "../components/Ornament";
import { Sync } from "./Sync";
import type { SyncStatus } from "../App";

function exportBackup(): boolean {
  try {
    const data = {
      app: "mnemonica-trainer",
      exportedAt: new Date().toISOString(),
      activeStack: getActiveStackId(),
      customStacks: getCustomStacks(),
      progress: loadAllProgress(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mnemonica-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return true;
  } catch {
    return false;
  }
}

export function Settings({
  activeStackId,
  onSwitchStack,
  onCreateStack,
  syncCode,
  syncStatus,
  onConnect,
  onDisconnect,
  onSyncNow,
  onPush,
  onPull,
  onChangeCode,
  onBack,
}: {
  activeStackId: string;
  onSwitchStack: (id: string) => void;
  onCreateStack: () => void;
  syncCode: string;
  syncStatus: SyncStatus;
  onConnect: (code: string) => void;
  onDisconnect: () => void;
  onSyncNow: () => void;
  onPush: () => void;
  onPull: () => void;
  onChangeCode: () => void;
  onBack: () => void;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [stacks, setStacks] = useState(allStacks);
  const [exported, setExported] = useState("");

  const activeName = stacks.find((s) => s.id === activeStackId)?.name ?? "this stack";
  const pendingName = stacks.find((s) => s.id === pending)?.name ?? "";
  const deletingName = stacks.find((s) => s.id === deleting)?.name ?? "";

  function confirmDelete() {
    if (!deleting) return;
    deleteCustomStack(deleting);
    deleteProgressFor(deleting);
    setDeleting(null);
    setStacks(allStacks());
  }

  function doExport() {
    setExported(exportBackup() ? "Backup downloaded." : "Export failed on this device.");
  }

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
          {stacks.map((s) => {
            const learned = learnedCount(loadStatsFor(s.id));
            const active = s.id === activeStackId;
            const custom = isCustomStack(s.id);
            return (
              <div key={s.id} className={`stack-row ${active ? "is-active" : ""}`}>
                <button
                  type="button"
                  className="stack-row-main"
                  onClick={() => !active && setPending(s.id)}
                  disabled={active}
                >
                  <span className="stack-row-name">{s.name}</span>
                  <span className="stack-row-author">{s.author}</span>
                </button>
                <span className="stack-row-meta">
                  {active ? "Active" : `${learned}/52 learned`}
                  {custom && !active && (
                    <button
                      type="button"
                      className="btn-link stack-delete"
                      onClick={() => setDeleting(s.id)}
                    >
                      delete
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        <button type="button" className="btn btn-ghost" onClick={onCreateStack}>
          + Create a custom stack
        </button>

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

        {deleting && (
          <div className="stack-confirm">
            <p className="confirm-text">
              Delete <strong>{deletingName}</strong> and its progress? This can't be undone.
            </p>
            <div className="confirm-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setDeleting(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete}>
                Delete {deletingName}
              </button>
            </div>
          </div>
        )}
      </section>

      <Ornament />

      <section className="setup-section">
        <h2 className="section-title">Backup</h2>
        <p className="setup-text">
          Download everything — every stack's progress, your hooks and pegs, custom stacks — as one
          JSON file.
        </p>
        <button type="button" className="btn btn-ghost" onClick={doExport}>
          Export backup
        </button>
        {exported && <p className="sync-status">{exported}</p>}
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
          onChangeCode={onChangeCode}
        />
      </section>
    </div>
  );
}
