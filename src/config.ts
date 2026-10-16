import * as fs from "fs";
import * as path from "path";

// Minimal .env parser (KEY=VALUE, optional quotes, # comments). No dependency.
export function parseEnvFile(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

export function loadEnvFile(file: string): Record<string, string> {
  try {
    return parseEnvFile(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

export interface LocalConfig {
  baseUrl?: string;
  token?: string;
  source: "args" | "env" | "none";
}

// Local (stdio) mode: positional args win; with no positional args, fall back to
// PAPERLESS_URL / PAPERLESS_API_KEY from the process env, then from .env
// (PAPERLESS_ENV_FILE or ./.env). Values are never logged.
export function resolveLocalConfig(
  positional: string[],
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd()
): LocalConfig {
  if (positional.length > 0) {
    return { baseUrl: positional[0], token: positional[1], source: "args" };
  }
  const file = loadEnvFile(env.PAPERLESS_ENV_FILE || path.join(cwd, ".env"));
  const baseUrl = env.PAPERLESS_URL || file.PAPERLESS_URL;
  const token = env.PAPERLESS_API_KEY || file.PAPERLESS_API_KEY;
  return { baseUrl, token, source: baseUrl || token ? "env" : "none" };
}

// Positional args = everything that is not a flag or a flag's value.
export function positionalArgs(argv: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--port") { i++; continue; }
    if (argv[i].startsWith("--")) continue;
    out.push(argv[i]);
  }
  return out;
}
