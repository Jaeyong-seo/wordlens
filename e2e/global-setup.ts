import fs from "node:fs";
import path from "node:path";

/** Fresh known-words/dict-cache state for every E2E run. */
export default function globalSetup(): void {
  const dataDir = path.join(__dirname, "..", ".data-e2e");
  fs.rmSync(dataDir, { recursive: true, force: true });
}
