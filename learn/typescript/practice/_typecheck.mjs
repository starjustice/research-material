// Runs the real TypeScript compiler on one file and returns the error lines.
// Used by the tests of the TypeScript lessons. Strict mode is on, like in a real project.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const tsc = path.join(here, "node_modules", "typescript", "bin", "tsc");

export function typecheck(file, extraFlags = []) {
  const target = path.isAbsolute(file) ? file : path.join(here, file);
  const run = spawnSync(
    process.execPath,
    [tsc, "--noEmit", "--strict", "--target", "es2022", "--module", "nodenext", "--moduleResolution", "nodenext", "--skipLibCheck", "--allowImportingTsExtensions", "--pretty", "false", ...extraFlags, target],
    { encoding: "utf8" }
  );
  const lines = (run.stdout + run.stderr).split("\n").filter((l) => /error TS\d+/.test(l));
  return { ok: run.status === 0, errors: lines };
}
