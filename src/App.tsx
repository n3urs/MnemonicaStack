import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyAnswer,
  applyNote,
  applyPeg,
  applyTimedRun,
  defaultStats,
  introduceCard,
  loadAllProgress,
  loadStats,
  mergeProgress,
  retireLastTimedRun,
  saveAllProgress,
  saveStats,
  type CardNote,
  type Stats,
  type TimedMode,
} from "./storage";
import {
  deleteProgress,
  generateSyncCode,
  getSyncCode,
  pullProgress,
  pushProgress,
  saveSyncCode,
  syncConfigured,
} from "./sync";
import { getActiveStackId, setActiveStackId } from "./stacks";
import type { Mode } from "./quiz";
import { Home } from "./screens/Home";
import { Learn } from "./screens/Learn";
import { Drill } from "./screens/Drill";
import { Stats as StatsScreen } from "./screens/Stats";
import { Reference } from "./screens/Reference";
import { Setup } from "./screens/Setup";
import { Insights } from "./screens/Insights";
import { Settings } from "./screens/Settings";
import { Toolkit } from "./screens/Toolkit";
import { Timed } from "./screens/Timed";
import { Acaan } from "./screens/Acaan";
import { AudioDrill } from "./screens/AudioDrill";
import { StackEditor } from "./screens/StackEditor";
import { SoundKey } from "./components/SoundKey";

type Screen =
  | { name: "home" }
  | { name: "learn" }
  | { name: "drill"; mode: Mode }
  | { name: "stats" }
  | { name: "reference" }
  | { name: "setup" }
  | { name: "insights" }
  | { name: "settings" }
  | { name: "stackEditor" }
  | { name: "toolkit" }
  | { name: "timed"; mode: TimedMode }
  | { name: "acaan" }
  | { name: "audio" };

export type SyncStatus = { busy: boolean; message: string };

export default function App() {
  const [stats, setStats] = useState<Stats>(loadStats);
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [syncCode, setSyncCode] = useState<string>(getSyncCode);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ busy: false, message: "" });

  const inited = useRef(false);

  // Refresh the active stack's stats into React state from whatever's now in
  // localStorage (after a merge / pull writes to the per-stack keys).
  const refreshActive = useCallback((map: Record<string, Stats>) => {
    const active = map[getActiveStackId()];
    if (active) setStats(active);
  }, []);

  // Pull the cloud's per-stack map, merge it with this device (newer wins per
  // stack — no stack's progress is ever lost), save, and push the union back.
  const reconcile = useCallback(
    async (code: string) => {
      if (!syncConfigured() || !code) return;
      setSyncStatus({ busy: true, message: "Syncing…" });
      try {
        const cloud = await pullProgress(code);
        const local = loadAllProgress();
        const merged = cloud ? mergeProgress(local, cloud) : local;
        saveAllProgress(merged);
        refreshActive(merged);
        await pushProgress(code, merged);
        setSyncStatus({ busy: false, message: "Synced — every stack is in step." });
      } catch {
        setSyncStatus({ busy: false, message: "Sync failed — check your connection." });
      }
    },
    [refreshActive],
  );

  const forcePull = useCallback(async () => {
    if (!syncConfigured() || !syncCode) return;
    setSyncStatus({ busy: true, message: "Pulling…" });
    try {
      const cloud = await pullProgress(syncCode);
      if (cloud) {
        saveAllProgress(cloud);
        refreshActive(cloud);
        setSyncStatus({ busy: false, message: "Pulled the cloud copy to this device." });
      } else {
        setSyncStatus({ busy: false, message: "No cloud data found for that code yet." });
      }
    } catch {
      setSyncStatus({ busy: false, message: "Pull failed — check your connection." });
    }
  }, [syncCode, refreshActive]);

  const forcePush = useCallback(async () => {
    if (!syncConfigured() || !syncCode) return;
    setSyncStatus({ busy: true, message: "Pushing…" });
    try {
      await pushProgress(syncCode, loadAllProgress());
      setSyncStatus({ busy: false, message: "Pushed this device to the cloud." });
    } catch {
      setSyncStatus({ busy: false, message: "Push failed — check your connection." });
    }
  }, [syncCode]);

  const connectSync = useCallback(
    (code: string) => {
      saveSyncCode(code);
      setSyncCode(code);
      inited.current = true;
      void reconcile(code);
    },
    [reconcile],
  );

  const disconnectSync = useCallback(() => {
    saveSyncCode("");
    setSyncCode("");
    setSyncStatus({ busy: false, message: "Sync turned off on this device." });
  }, []);

  // Rotate the sync code: push everything to a fresh row, adopt the new code,
  // and best-effort delete the old row. The old code stops working.
  const changeSyncCode = useCallback(async () => {
    if (!syncConfigured()) return;
    const oldCode = getSyncCode();
    const code = generateSyncCode();
    setSyncStatus({ busy: true, message: "Re-keying…" });
    try {
      await pushProgress(code, loadAllProgress());
      saveSyncCode(code);
      setSyncCode(code);
      if (oldCode) deleteProgress(oldCode).catch(() => {});
      setSyncStatus({ busy: false, message: "New code active — enter it on your other devices." });
    } catch {
      setSyncStatus({ busy: false, message: "Couldn't re-key — check your connection." });
    }
  }, []);

  // Switch the active stack. Each stack's progress lives under its own key, so
  // this only changes which one is loaded. We reload so the stack order and the
  // loaded progress re-initialise cleanly everywhere.
  const switchStack = useCallback((id: string) => {
    if (id === getActiveStackId()) return;
    setActiveStackId(id);
    window.location.reload();
  }, []);

  // Reconcile once on launch if sync is already connected.
  useEffect(() => {
    const code = getSyncCode();
    if (syncConfigured() && code) {
      void reconcile(code).finally(() => {
        inited.current = true;
      });
    } else {
      inited.current = true;
    }
  }, [reconcile]);

  // Auto-push on change (debounced) once the launch reconcile has run.
  useEffect(() => {
    if (!syncConfigured() || !syncCode || !inited.current) return;
    const t = setTimeout(() => {
      pushProgress(syncCode, loadAllProgress()).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [stats, syncCode]);

  // Flush to the cloud when leaving the app (background / close) and refresh
  // when returning — so switching devices "just works", no manual push/pull.
  useEffect(() => {
    if (!syncConfigured()) return;
    const flush = () => {
      const code = getSyncCode();
      if (code) pushProgress(code, loadAllProgress()).catch(() => {});
    };
    const onVisibility = () => {
      const code = getSyncCode();
      if (!code) return;
      if (document.visibilityState === "hidden") flush();
      else void reconcile(code);
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, [reconcile]);

  const recordAnswer = useCallback((card: string, correct: boolean, elapsedMs?: number) => {
    setStats((prev) => {
      const next = applyAnswer(prev, card, correct, elapsedMs);
      saveStats(next);
      return next;
    });
  }, []);

  const introduce = useCallback((card: string) => {
    setStats((prev) => {
      const next = introduceCard(prev, card);
      saveStats(next);
      return next;
    });
  }, []);

  const setNote = useCallback((card: string, patch: CardNote) => {
    setStats((prev) => {
      const next = applyNote(prev, card, patch);
      saveStats(next);
      return next;
    });
  }, []);

  const setPeg = useCallback((position: number, value: string) => {
    setStats((prev) => {
      const next = applyPeg(prev, position, value);
      saveStats(next);
      return next;
    });
  }, []);

  const recordTimedRun = useCallback((avgSeconds: number, mode: TimedMode) => {
    setStats((prev) => {
      const next = applyTimedRun(prev, avgSeconds, mode);
      saveStats(next);
      return next;
    });
  }, []);

  const retireTimedRun = useCallback((mode: TimedMode) => {
    setStats((prev) => {
      const next = retireLastTimedRun(prev, mode);
      saveStats(next);
      return next;
    });
  }, []);

  const resetStats = useCallback(() => {
    const fresh = { ...defaultStats(), updatedAt: Date.now() };
    saveStats(fresh);
    setStats(fresh);
  }, []);

  const goHome = () => setScreen({ name: "home" });

  // Lock scroll only on the drill, whose content is sized to fit the viewport.
  // NOT the learn screen — it has text fields and an expandable help section,
  // so it's taller than the viewport, and locking it traps you below the fold
  // when the keyboard scrolls a field into view (can't reach Back). The timed
  // screen manages its own lock for its fitted sub-views.
  useEffect(() => {
    const noScroll = screen.name === "drill" || screen.name === "acaan";
    document.body.classList.toggle("no-scroll", noScroll);
    return () => document.body.classList.remove("no-scroll");
  }, [screen]);

  return (
    <div className="app">
      {screen.name === "home" && (
        <Home
          stats={stats}
          onLearn={() => setScreen({ name: "learn" })}
          onStart={(mode) => setScreen({ name: "drill", mode })}
          onAcaan={() => setScreen({ name: "acaan" })}
          onStats={() => setScreen({ name: "stats" })}
          onReference={() => setScreen({ name: "reference" })}
          onSetup={() => setScreen({ name: "setup" })}
          onInsights={() => setScreen({ name: "insights" })}
          onSettings={() => setScreen({ name: "settings" })}
          onToolkit={() => setScreen({ name: "toolkit" })}
          onTimed={(mode) => setScreen({ name: "timed", mode })}
          onAudio={() => setScreen({ name: "audio" })}
        />
      )}
      {screen.name === "learn" && (
        <Learn
          stats={stats}
          onIntroduce={introduce}
          onSetNote={setNote}
          onSetPeg={setPeg}
          onBack={goHome}
        />
      )}
      {screen.name === "drill" && (
        <Drill
          mode={screen.mode}
          stats={stats}
          onRecord={recordAnswer}
          onBack={goHome}
          onLearn={() => setScreen({ name: "learn" })}
        />
      )}
      {screen.name === "stats" && <StatsScreen stats={stats} onBack={goHome} onReset={resetStats} />}
      {screen.name === "reference" && <Reference stats={stats} onBack={goHome} />}
      {screen.name === "setup" && <Setup onBack={goHome} />}
      {screen.name === "insights" && (
        <Insights onBack={goHome} onSetup={() => setScreen({ name: "setup" })} />
      )}
      {screen.name === "settings" && (
        <Settings
          activeStackId={getActiveStackId()}
          onSwitchStack={switchStack}
          onCreateStack={() => setScreen({ name: "stackEditor" })}
          syncCode={syncCode}
          syncStatus={syncStatus}
          onConnect={connectSync}
          onDisconnect={disconnectSync}
          onSyncNow={() => void reconcile(syncCode)}
          onPush={forcePush}
          onPull={forcePull}
          onChangeCode={() => void changeSyncCode()}
          onBack={goHome}
        />
      )}
      {screen.name === "acaan" && (
        <Acaan stats={stats} onBack={goHome} onLearn={() => setScreen({ name: "learn" })} />
      )}
      {screen.name === "audio" && (
        <AudioDrill stats={stats} onBack={goHome} onLearn={() => setScreen({ name: "learn" })} />
      )}
      {screen.name === "stackEditor" && (
        <StackEditor
          onBack={() => setScreen({ name: "settings" })}
          onSaved={() => setScreen({ name: "settings" })}
        />
      )}
      {screen.name === "toolkit" && <Toolkit onBack={goHome} />}
      {screen.name === "timed" && (
        <Timed
          mode={screen.mode}
          stats={stats}
          onComplete={recordTimedRun}
          onRetire={retireTimedRun}
          onBack={goHome}
          onLearn={() => setScreen({ name: "learn" })}
        />
      )}
      {/* The sound-key hint is about the Major-system letters — not relevant
          on the timed screen, where it would also overlap the speed chart. */}
      {screen.name !== "timed" && <SoundKey />}
    </div>
  );
}
