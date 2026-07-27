import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

if (process.platform === "linux" && process.arch === "x64") {
  const require = createRequire(import.meta.url);

  try {
    require.resolve("@rollup/rollup-linux-x64-gnu");
  } catch {
    execFileSync(
      "npm",
      ["install", "--no-save", "--workspace=arena-camp-frontend", "@rollup/rollup-linux-x64-gnu@4.62.2"],
      { stdio:"inherit" }
    );
  }
}
