#!/usr/bin/env node
/**
 * setup.js — Run this once after cloning on any machine.
 * Does everything:
 *   1. Installs Coral CLI (if not already installed)
 *   2. Creates data/ directory
 *   3. Updates all Coral manifest paths for this machine
 *   4. Updates CORAL_DATA_PATH in .env
 *
 * Usage: node scripts/setup.js
 *    or: npm run setup
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const https = require("https");
const { execSync, execFileSync } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const CORAL_SOURCES_DIR = path.join(PROJECT_ROOT, "coral", "sources");
const IS_WINDOWS = os.platform() === "win32";
const IS_MAC = os.platform() === "darwin";

// ─── Helpers ────────────────────────────────────────────────────────────────

function toFileUrl(dirPath) {
  const normalized = dirPath.replace(/\\/g, "/");
  const withSlash = normalized.endsWith("/") ? normalized : normalized + "/";
  return IS_WINDOWS ? "file:///" + withSlash : "file://" + withSlash;
}

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: "pipe", ...opts }).trim();
  } catch {
    return null;
  }
}

function log(emoji, msg) {
  console.log(`${emoji} ${msg}`);
}

// ─── Step 1: Find or install Coral CLI ──────────────────────────────────────

function findCoralBinary() {
  // Check system PATH first
  const v = run("coral --version");
  if (v) return { path: "coral", version: v };

  // Windows default install location
  if (IS_WINDOWS) {
    const winPath = path.join(
      os.homedir(),
      "AppData", "Local", "Programs", "coral", "coral.exe"
    );
    if (fs.existsSync(winPath)) {
      const v2 = run(`"${winPath}" --version`);
      if (v2) return { path: winPath, version: v2 };
    }
  }

  // Mac/Linux default install location
  const unixPaths = ["/usr/local/bin/coral", `${os.homedir()}/.local/bin/coral`];
  for (const p of unixPaths) {
    if (fs.existsSync(p)) {
      const v3 = run(`"${p}" --version`);
      if (v3) return { path: p, version: v3 };
    }
  }

  return null;
}

async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const request = (u) => {
      https.get(u, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          request(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${u}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      }).on("error", reject);
    };
    request(url);
  });
}

async function installCoralWindows() {
  const INSTALL_DIR = path.join(os.homedir(), "AppData", "Local", "Programs", "coral");
  const coralExe = path.join(INSTALL_DIR, "coral.exe");

  log("⬇️ ", "Downloading Coral CLI for Windows...");

  const zipPath = path.join(os.tmpdir(), "coral.zip");
  const downloadUrl =
    "https://github.com/withcoral/coral/releases/latest/download/coral-x86_64-pc-windows-msvc.zip";

  await downloadFile(downloadUrl, zipPath);
  log("📦", "Downloaded coral.zip");

  // Extract using PowerShell
  fs.mkdirSync(INSTALL_DIR, { recursive: true });
  run(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${os.tmpdir()}\\coral-extract' -Force"`);

  // Find coral.exe in extracted dir
  const extractDir = path.join(os.tmpdir(), "coral-extract");
  const files = fs.readdirSync(extractDir);
  const exeFile = files.find((f) => f.endsWith(".exe"));
  if (!exeFile) throw new Error("coral.exe not found in zip");

  fs.copyFileSync(path.join(extractDir, exeFile), coralExe);
  log("✅", `Installed coral.exe → ${coralExe}`);

  // Add to user PATH permanently
  const currentPath = run(`powershell -Command "[Environment]::GetEnvironmentVariable('PATH','User')"`);
  if (currentPath && !currentPath.includes(INSTALL_DIR)) {
    run(
      `powershell -Command "[Environment]::SetEnvironmentVariable('PATH','${currentPath};${INSTALL_DIR}','User')"`
    );
    log("✅", "Added Coral to user PATH (restart terminal after setup)");
  }

  // Cleanup
  try { fs.rmSync(extractDir, { recursive: true }); fs.unlinkSync(zipPath); } catch {}

  const version = run(`"${coralExe}" --version`);
  return { path: coralExe, version };
}

async function installCoralUnix() {
  log("⬇️ ", "Installing Coral CLI via install.sh...");
  try {
    execSync("curl -fsSL https://withcoral.com/install.sh | sh", {
      stdio: "inherit",
      shell: true,
    });
  } catch {
    throw new Error("curl install failed. Try: brew install withcoral/tap/coral");
  }
  const coral = findCoralBinary();
  if (!coral) throw new Error("Coral install succeeded but binary not found in PATH");
  return coral;
}

// ─── Step 2: Update manifests ───────────────────────────────────────────────

function updateManifests(newLocationUrl) {
  const sources = fs
    .readdirSync(CORAL_SOURCES_DIR)
    .filter((name) =>
      fs.existsSync(path.join(CORAL_SOURCES_DIR, name, "manifest.yaml"))
    );

  const locationRegex = /location:\s*"file:\/\/[^"]+"/g;
  let updated = 0;

  for (const source of sources) {
    const manifestPath = path.join(CORAL_SOURCES_DIR, source, "manifest.yaml");
    let content = fs.readFileSync(manifestPath, "utf8");
    const newContent = content.replace(
      locationRegex,
      `location: "${newLocationUrl}"`
    );
    if (newContent !== content) {
      fs.writeFileSync(manifestPath, newContent, "utf8");
      log("✅", `Manifest updated: ${source}`);
      updated++;
    }
    locationRegex.lastIndex = 0;
  }
  return { total: sources.length, updated };
}

// ─── Step 3: Update .env ────────────────────────────────────────────────────

function updateEnv(coralBinPath) {
  const envPath = path.join(PROJECT_ROOT, ".env");
  const envExamplePath = path.join(PROJECT_ROOT, ".env.example");

  let envContent = "";
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  } else if (fs.existsSync(envExamplePath)) {
    envContent = fs.readFileSync(envExamplePath, "utf8");
    log("📋", "Created .env from .env.example");
  }

  // Update CORAL_DATA_PATH
  if (envContent.match(/^CORAL_DATA_PATH=.*/m)) {
    envContent = envContent.replace(/^CORAL_DATA_PATH=.*/m, `CORAL_DATA_PATH=${DATA_DIR}`);
  } else {
    envContent += `\nCORAL_DATA_PATH=${DATA_DIR}\n`;
  }

  // Update CORAL_CLI_PATH if not default 'coral'
  if (coralBinPath && coralBinPath !== "coral") {
    if (envContent.match(/^CORAL_CLI_PATH=.*/m)) {
      envContent = envContent.replace(/^CORAL_CLI_PATH=.*/m, `CORAL_CLI_PATH=${coralBinPath}`);
    } else {
      envContent += `CORAL_CLI_PATH=${coralBinPath}\n`;
    }
  }

  fs.writeFileSync(envPath, envContent, "utf8");
  log("✅", `Updated .env → CORAL_DATA_PATH=${DATA_DIR}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🏥 Mom-Care Setup");
  console.log("==================");
  console.log(`Platform  : ${os.platform()} (${os.arch()})`);
  console.log(`Project   : ${PROJECT_ROOT}\n`);

  // 1. Coral CLI
  let coral = findCoralBinary();
  if (coral) {
    log("✅", `Coral CLI already installed: ${coral.version} (${coral.path})`);
  } else {
    log("🔍", "Coral CLI not found. Installing...");
    try {
      coral = IS_WINDOWS
        ? await installCoralWindows()
        : await installCoralUnix();
      log("🎉", `Coral installed: ${coral.version}`);
    } catch (err) {
      log("❌", `Could not auto-install Coral: ${err.message}`);
      log("📌", "Install manually:");
      if (IS_WINDOWS) {
        log("   ", "Download from: https://github.com/withcoral/coral/releases");
        log("   ", "Extract coral.exe and add to PATH");
      } else if (IS_MAC) {
        log("   ", "Run: brew install withcoral/tap/coral");
      } else {
        log("   ", "Run: curl -fsSL https://withcoral.com/install.sh | sh");
      }
      coral = { path: "coral", version: null };
    }
  }

  // 2. Create data/ dir
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    log("✅", "Created data/ directory");
  } else {
    log("✅", "data/ directory exists");
  }

  // 3. Update manifests
  const newLocationUrl = toFileUrl(DATA_DIR);
  const { total, updated } = updateManifests(newLocationUrl);
  log("✅", `Manifests updated: ${updated}/${total}`);

  // 4. Update .env
  updateEnv(coral.path);

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log("\n📊 Setup Complete!");
  console.log("==================");
  console.log(`Coral CLI  : ${coral.version ?? "❌ Install manually"}`);
  console.log(`Data dir   : ${DATA_DIR}`);
  console.log(`Manifests  : ${updated}/${total} updated`);

  const envPath = path.join(PROJECT_ROOT, ".env");
  const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const hasGemini = envContent.includes("GEMINI_API_KEY=") && !envContent.includes("GEMINI_API_KEY=your");
  const hasMongo = envContent.includes("MONGODB_URI=") && !envContent.includes("MONGODB_URI=mongodb+srv://username");

  console.log(`\n.env status:`);
  console.log(`  GEMINI_API_KEY  : ${hasGemini ? "✅ Set" : "⚠️  Fill this in .env"}`);
  console.log(`  MONGODB_URI     : ${hasMongo ? "✅ Set" : "⚠️  Fill this in .env"}`);
  console.log(`  CORAL_DATA_PATH : ✅ Auto-set`);

  if (!hasGemini || !hasMongo) {
    console.log("\n📝 Edit .env and fill in the missing values, then run:");
  } else {
    console.log("\n🚀 Ready! Run:");
  }
  console.log("   npm run dev");
  console.log("");

  if (IS_WINDOWS && coral.path !== "coral") {
    console.log("⚠️  Coral was added to PATH. Open a new terminal before running npm run dev.\n");
  }
}

main().catch((err) => {
  console.error("\n❌ Setup failed:", err.message);
  process.exit(1);
});
