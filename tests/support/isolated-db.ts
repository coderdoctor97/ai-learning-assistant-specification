import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Import before any database-backed application modules in server-side contracts.
export const isolatedDbDirectory = mkdtempSync(path.join(tmpdir(), "studio-bootstrap-contract-"));
process.env.STUDIO_DATA_DIR = isolatedDbDirectory;
delete process.env.STUDIO_DB_PATH;
