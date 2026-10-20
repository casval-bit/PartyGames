// Lance les tests du moteur (ceux qui importent hostEngine.js) : chacun est empaqueté par esbuild puis exécuté avec Node.
import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { unlinkSync } from "node:fs";

const tests = ["tools/test-quit.js", "tools/test-timeline.js", "tools/test-party.js", "tools/test-board.js", "tools/test-petitbac.js", "tools/test-quiest.js", "tools/test-celeb.js"];
let failed = 0;
for (const t of tests) {
  const out = `.tmp-${t.split("/").pop().replace(".js", "")}.mjs`;
  await build({ entryPoints: [t], bundle: true, platform: "node", format: "esm", loader: { ".csv": "text" }, logLevel: "error", outfile: out });
  const r = spawnSync(process.execPath, [out], { stdio: ["ignore", "pipe", "inherit"], encoding: "utf8" });
  const lines = r.stdout.split("\n").filter((l) => !l.startsWith("ok"));
  console.log(`== ${t}\n${lines.join("\n").trim()}`);
  if (r.status !== 0) failed++;
  try { unlinkSync(out); } catch { /* déjà supprimé */ }
}
process.exit(failed ? 1 : 0);
