import { normalizeStats, type Stats } from "./storage";

// ---------------------------------------------------------------------------
// Cloud sync via Supabase (PostgREST).
//
// These two values are safe to ship in the app: the anon key is public by
// design — access is governed by row-level security, and your data is keyed by
// your private sync code (the row id), which acts as the shared secret between
// your devices. Paste your project's values here to switch sync on.
// ---------------------------------------------------------------------------
const SUPABASE_URL: string = "https://gcrvuayplqtzonubktuu.supabase.co";
const SUPABASE_ANON_KEY: string = "sb_publishable_Uv4oEi7bDcuO0rNBbsJPgQ_QSPhmBAd"; // publishable (public) key

export function syncConfigured(): boolean {
  return SUPABASE_URL !== "" && SUPABASE_ANON_KEY !== "";
}

const CODE_KEY = "mnemonica-sync-code";

export function getSyncCode(): string {
  try {
    return localStorage.getItem(CODE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveSyncCode(code: string): void {
  try {
    if (code) localStorage.setItem(CODE_KEY, code);
    else localStorage.removeItem(CODE_KEY);
  } catch {
    // ignore
  }
}

export function generateSyncCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function authHeaders(): Record<string, string> {
  return { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };
}

export async function pushProgress(code: string, stats: Stats): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/progress`, {
    method: "POST",
    keepalive: true, // let the request finish even if the app is backgrounding
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify([
      { id: code, payload: stats, updated_at: new Date(stats.updatedAt || Date.now()).toISOString() },
    ]),
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
}

export async function pullProgress(code: string): Promise<Stats | null> {
  const url = `${SUPABASE_URL}/rest/v1/progress?id=eq.${encodeURIComponent(code)}&select=payload`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const rows = (await res.json()) as { payload: Partial<Stats> }[];
  if (!rows.length) return null;
  return normalizeStats(rows[0].payload);
}
