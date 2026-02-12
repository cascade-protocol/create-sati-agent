import fs from "node:fs";
import path from "node:path";

export const REGISTRATION_FILE = "agent-registration.json";

/**
 * Find git root by walking up from startDir looking for .git directory.
 */
export function findGitRoot(startDir: string): string | null {
  let dir = path.resolve(startDir);
  const root = path.parse(dir).root;

  while (dir !== root) {
    if (fs.existsSync(path.join(dir, ".git"))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return null;
}

/**
 * Find agent-registration.json by walking up from CWD to git root.
 * Returns the full path if found, null otherwise.
 */
export function findRegistrationFile(startDir?: string): string | null {
  const cwd = startDir ?? process.cwd();
  const gitRoot = findGitRoot(cwd);
  const searchRoot = gitRoot ?? path.parse(path.resolve(cwd)).root;

  let dir = path.resolve(cwd);
  while (true) {
    const candidate = path.join(dir, REGISTRATION_FILE);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    if (dir === searchRoot) break;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Read and parse agent-registration.json.
 */
export function readRegistrationFile(filePath: string): Record<string, unknown> {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as Record<string, unknown>;
}

/**
 * Write agent-registration.json with pretty formatting.
 */
export function writeRegistrationFile(filePath: string, data: Record<string, unknown>): void {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}
