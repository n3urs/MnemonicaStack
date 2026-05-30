import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyAnswer,
  applyNote,
  applyPeg,
  applyTimedRun,
  defaultStats,
  introduceCard,
  loadStats,
  retireLastTimedRun,
  saveStats,
  type CardNote,
  type Stats,
} from "./storage";
import {
  getSyncCode,
  pullProgress,
  pushProgress,
  saveSyncCode,
  syncConfigured,
} from "./sync";
import type { Mode } from "./quiz";
import { Home } from "./screens/Home";
import { Learn } from "./screens/Learn";
import { Drill } from "./screens/Drill";
import { Stats as StatsScreen } from "./screens/Stats";
import { Reference } from "./screens/Reference";
import { Setup } from "./screens/Setup";
import { Insights } from "./screens/Insights";
import { Sync } from "./screens/Sync";
import { Toolkit } from "./screens/Toolkit";
import { Session } from "./screens/Session";
import { Timed } from "./screens/Timed";
import { SoundKey } from "./components/SoundKey";

type Screen =
  | { name: "home" }
  | { name: "learn" }
  | { name: "drill"; mode: Mode }
  | { name: "session" }
  | { name: "stats" }
  | { name: "reference" }
  | { name: "setup" }
  | { name: "insights" }
  | { name: "sync" }
  | { name: "toolkit" }
  | { name: "timed" };

export type SyncStatus = { busy: boolean; message: string };

export default function App() {
  const [stats, setStats] = useState<Stats>(loadStats);
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [syncCode, setSyncCode] = useState<string>(getSyncCode);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ busy: false, message: "" });

  const statsRef = useRef(stats);
  statsRef.current = stats;
  const inited = useRef(false);

  const adopt = useCallback((s: Stats) => {
    saveStats(s);
    setStats(s);
  }, []);

  // Pull the cloud copy; adopt it if it's newer, otherwise back up this device.
  const reconcile = useCallback(
    async (code: string) => {
      if (!syncConfigured() || !code) return;
      setSyncStatus({ busy: true, message: "Syncing…" });
      try {
        const cloud = await pullProgress(code);
        if (cloud && cloud.updatedAt >= statsRef.current.updatedAt) {
          adopt(cloud);
          setSyncStatus({ busy: false, message: "Pulled the newer copy from the cloud." });
        } else {
          await pushProgress(code, statsRef.current);
          setSyncStatus({ busy: false, message: "This device is backed up to the cloud." });
        }
      } catch {
        setSyncStatus({ busy: false, message: "Sync failed — check your connection." });
      }
    },
    [adopt],
  );

  const forcePull = useCallback(
    async () => {
      if (!syncConfigured() || !syncCode) return;
      setSyncStatus({ busy: true, message: "Pulling…" });
      try {
        const cloud = await pullProgress(syncCode);
        if (cloud) {
          adopt(cloud);
          setSyncStatus({ busy: false, message: "Replaced this device with the cloud copy." });
        } else {
          setSyncStatus({ busy: false, message: "No cloud data found for that code yet." });
        }
      } catch {
        setSyncStatus({ busy: false, message: "Pull failed — check your connection." });
      }
    },
    [adopt, syncCode],
  );

  const forcePush = useCallback(async () => {
    if (!syncConfigured() || !syncCode) return;
    setSyncStatus({ busy: true, message: "Pushing…" });
    try {
      await pushProgress(syncCode, statsRef.current);
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
      pushProgress(syncCode, statsRef.current).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [stats, syncCode]);

  // Flush to the cloud when leaving the app (background / close) and refresh
  // when returning — so switching devices "just works", no manual push/pull.
  useEffect(() => {
    if (!syncConfigured()) return;
    const flush = () => {
      const code = getSyncCode();
      if (code) pushProgress(code, statsRef.current).catch(() => {});
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

  const recordAnswer = useCallback((card: string, correct: boolean) => {
    setStats((prev) => {
      const next = applyAnswer(prev, card, correct);
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

  const recordTimedRun = useCallback((avgSeconds: number) => {
    setStats((prev) => {
      const next = applyTimedRun(prev, avgSeconds);
      saveStats(next);
      return next;
    });
  }, []);

  const retireTimedRun = useCallback(() => {
    setStats((prev) => {
      const next = retireLastTimedRun(prev);
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

  // Lock scroll on screens whose content fits the viewport — kills the small
  // "scroll into nothing" feel on the drill and learn screens. The control and
  // session screens manage their own lock (they have scrollable sub-views).
  useEffect(() => {
    const noScroll = screen.name === "drill" || screen.name === "learn";
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
          onSession={() => setScreen({ name: "session" })}
          onStats={() => setScreen({ name: "stats" })}
          onReference={() => setScreen({ name: "reference" })}
          onSetup={() => setScreen({ name: "setup" })}
          onInsights={() => setScreen({ name: "insights" })}
          onSync={() => setScreen({ name: "sync" })}
          onToolkit={() => setScreen({ name: "toolkit" })}
          onTimed={() => setScreen({ name: "timed" })}
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
      {screen.name === "session" && (
        <Session
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
      {screen.name === "sync" && (
        <Sync
          syncCode={syncCode}
          status={syncStatus}
          onConnect={connectSync}
          onDisconnect={disconnectSync}
          onSyncNow={() => void reconcile(syncCode)}
          onPush={forcePush}
          onPull={forcePull}
          onBack={goHome}
        />
      )}
      {screen.name === "toolkit" && <Toolkit onBack={goHome} />}
      {screen.name === "timed" && (
        <Timed
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
