import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `base` controls the public URL that asset paths are written against in the
// built HTML. GitHub Pages serves project sites under /<repo-name>/, so without
// this the bundle would request /assets/* and 404. Capacitor builds need the
// default "/" — they serve from the app root — so we only apply the prefix in
// the Pages build, gated by the GITHUB_PAGES env var the workflow sets.
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES ? "/MnemonicaStack/" : "/",
});
