// coral.client.ts
// Wraps the Coral CLI (coral sql --format json) as a Node.js module

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);

const CORAL_BIN =
  process.env.CORAL_CLI_PATH ||
  path.join(
    process.env.USERPROFILE || "C:\\Users\\rk225",
    "AppData\\Local\\Programs\\coral\\coral.exe"
  );
const CORAL_TIMEOUT = parseInt(process.env.CORAL_CLI_TIMEOUT || "20000", 10);

export interface CoralRow {
  [key: string]: string | number | null;
}

export interface CoralResult {
  columns: string[];
  rows: CoralRow[];
  durationMs: number;
  sql: string;
}

/**
 * Run a Coral SQL query and return structured results.
 * Uses `coral sql --format json` under the hood.
 */
export async function runCoralQuery(sql: string): Promise<CoralResult> {
  const t0 = Date.now();

  const { stdout } = await execFileAsync(
    CORAL_BIN,
    ["sql", "--format", "json", sql],
    {
      timeout: CORAL_TIMEOUT,
      maxBuffer: 1024 * 1024 * 10, // 10MB
    }
  );

  const durationMs = Date.now() - t0;

  // Parse coral JSON output: array of row objects
  let parsed: CoralRow[] = [];
  try {
    parsed = JSON.parse(stdout.trim());
  } catch {
    // Sometimes coral wraps it in { rows: [...] }
    try {
      const wrapper = JSON.parse(stdout.trim());
      parsed = wrapper.rows ?? wrapper.data ?? [];
    } catch {
      parsed = [];
    }
  }

  const columns = parsed.length > 0 ? Object.keys(parsed[0]) : [];

  return { columns, rows: parsed, durationMs, sql };
}

/**
 * Register a Coral source from a manifest file.
 * coral source add --file <manifestPath>
 */
export async function registerCoralSource(manifestPath: string): Promise<string> {
  const { stdout, stderr } = await execFileAsync(
    CORAL_BIN,
    ["source", "add", "--file", manifestPath],
    { timeout: 15000 }
  );
  return stdout || stderr;
}

/**
 * List all registered Coral sources.
 * coral source list
 */
export async function listCoralSources(): Promise<string> {
  const { stdout } = await execFileAsync(CORAL_BIN, ["source", "list"], {
    timeout: 10000,
  });
  return stdout;
}

/**
 * Check if Coral CLI is available and working.
 */
export async function checkCoralAvailable(): Promise<{ available: boolean; version?: string }> {
  try {
    const { stdout } = await execFileAsync(CORAL_BIN, ["--version"], {
      timeout: 5000,
    });
    return { available: true, version: stdout.trim() };
  } catch {
    return { available: false };
  }
}
