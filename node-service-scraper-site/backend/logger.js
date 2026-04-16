const fs = require("fs");
const path = require("path");
const util = require("util");

const LOG_ROOT = path.resolve(__dirname, "storage", "logs");
const LOG_FILE = path.join(LOG_ROOT, "backend.log");

function ensureLogRoot() {
  fs.mkdirSync(LOG_ROOT, { recursive: true });
}

function formatMeta(meta) {
  if (meta == null) return "";
  if (typeof meta === "string") return ` ${meta}`;
  return ` ${util.inspect(meta, { depth: 4, breakLength: 120, compact: true })}`;
}

function write(level, message, meta) {
  ensureLogRoot();
  const ts = new Date().toISOString();
  const line = `[${ts}] ${level.toUpperCase()} ${message}${formatMeta(meta)}`;

  fs.appendFileSync(LOG_FILE, `${line}\n`, "utf8");

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

function logInfo(message, meta) {
  write("info", message, meta);
}

function logWarn(message, meta) {
  write("warn", message, meta);
}

function logError(message, meta) {
  write("error", message, meta);
}

module.exports = {
  LOG_FILE,
  logInfo,
  logWarn,
  logError
};
