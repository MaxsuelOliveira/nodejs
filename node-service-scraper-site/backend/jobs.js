const fs = require("fs");
const path = require("path");
const { EventEmitter } = require("events");
const crypto = require("crypto");
const { logInfo, logWarn, logError } = require("./logger");

const jobs = new Map();
const JOBS_ROOT = path.resolve(__dirname, "storage", "jobs");
const JOB_STATE_FILE = "job.json";

function ensureJobsRoot() {
  fs.mkdirSync(JOBS_ROOT, { recursive: true });
}

function createEmitter() {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(50);
  return emitter;
}

function getJobDir(jobId) {
  return path.join(JOBS_ROOT, jobId);
}

function getJobStatePath(jobId) {
  return path.join(getJobDir(jobId), JOB_STATE_FILE);
}

function getLegacyZipPath(jobId) {
  return path.join(getJobDir(jobId), "zip", `site-${jobId}.zip`);
}

function listDirectories(targetPath) {
  if (!fs.existsSync(targetPath)) return [];

  return fs
    .readdirSync(targetPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function inferLegacyUrls(jobId) {
  const scrapedRoot = path.join(getJobDir(jobId), "scraped");
  const inferred = new Set();

  for (const firstLevel of listDirectories(scrapedRoot)) {
    const firstLevelPath = path.join(scrapedRoot, firstLevel);
    const nestedNames = listDirectories(firstLevelPath);
    const candidateNames = nestedNames.length ? nestedNames : [firstLevel];

    for (const candidate of candidateNames) {
      if (!candidate.includes(".")) continue;
      inferred.add(`https://${candidate}`);
    }
  }

  return Array.from(inferred);
}

function buildLegacyJob(jobId) {
  const zipPath = getLegacyZipPath(jobId);
  if (!fs.existsSync(zipPath)) return null;

  const stat = fs.statSync(zipPath);
  const urls = inferLegacyUrls(jobId);
  const timestamp = stat.mtime.toISOString();

  return {
    id: jobId,
    status: "completed",
    progress: 100,
    payload: {
      urls
    },
    logs: [
      {
        ts: timestamp,
        type: "success",
        message: "Job legado recuperado do storage local."
      }
    ],
    result: {
      zipPath,
      zipBytes: stat.size,
      downloadPath: `/api/jobs/${jobId}/download`
    },
    error: null,
    queuePosition: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    emitter: createEmitter()
  };
}

function serializeJob(job) {
  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    payload: job.payload,
    logs: job.logs,
    result: job.result,
    error: job.error,
    queuePosition: job.queuePosition ?? null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt
  };
}

function persistJob(job) {
  ensureJobsRoot();
  const statePath = getJobStatePath(job.id);

  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(serializeJob(job), null, 2), "utf8");
}

function emitJobUpdate(job) {
  job.emitter.emit("update", serializeJob(job));
}

function hydrateJob(rawJob) {
  return {
    id: rawJob.id,
    status: rawJob.status || "pending",
    progress: Number(rawJob.progress) || 0,
    payload: rawJob.payload || {},
    logs: Array.isArray(rawJob.logs) ? rawJob.logs : [],
    result: rawJob.result || null,
    error: rawJob.error || null,
    queuePosition: rawJob.queuePosition ?? null,
    createdAt: rawJob.createdAt || new Date().toISOString(),
    updatedAt: rawJob.updatedAt || rawJob.createdAt || new Date().toISOString(),
    emitter: createEmitter()
  };
}

function normalizeRecoveredJob(job) {
  if (job.status === "completed") {
    const zipPath = job.result?.zipPath;
    if (zipPath && fs.existsSync(zipPath)) {
      return job;
    }

    job.status = "failed";
    job.error = "Arquivo ZIP persistido nao foi encontrado no servidor.";
    job.result = null;
  }

  if (["pending", "queued", "running"].includes(job.status)) {
    job.status = "failed";
    job.error = "Servidor reiniciado antes da conclusao do job.";
    job.queuePosition = null;
    job.logs.push({
      ts: new Date().toISOString(),
      type: "warn",
      message: "Job marcado como falho apos reinicializacao do servidor."
    });
  }

  job.updatedAt = new Date().toISOString();
  return job;
}

function loadJobsFromDisk() {
  ensureJobsRoot();

  const entries = fs
    .readdirSync(JOBS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory());

  for (const entry of entries) {
    const statePath = getJobStatePath(entry.name);
    try {
      if (fs.existsSync(statePath)) {
        const raw = JSON.parse(fs.readFileSync(statePath, "utf8"));
        const job = normalizeRecoveredJob(hydrateJob(raw));
        jobs.set(job.id, job);
        persistJob(job);
        continue;
      }

      const legacyJob = buildLegacyJob(entry.name);
      if (!legacyJob) continue;

      jobs.set(legacyJob.id, legacyJob);
      persistJob(legacyJob);
    } catch (error) {
      logWarn(`Falha ao carregar job persistido ${entry.name}: ${error.message}`);
    }
  }
}

function createJob(payload = {}) {
  const now = new Date().toISOString();
  const job = {
    id: crypto.randomUUID(),
    status: "pending",
    progress: 0,
    payload,
    logs: [],
    result: null,
    error: null,
    queuePosition: null,
    createdAt: now,
    updatedAt: now,
    emitter: createEmitter()
  };

  jobs.set(job.id, job);
  persistJob(job);
  return job;
}

function getJob(jobId) {
  return jobs.get(jobId);
}

function listJobs() {
  return Array.from(jobs.values())
    .sort((left, right) => {
      const a = new Date(right.createdAt).getTime();
      const b = new Date(left.createdAt).getTime();
      return a - b;
    })
    .map((job) => serializeJob(job));
}

function updateJob(jobId, patch = {}) {
  const job = jobs.get(jobId);
  if (!job) return null;

  Object.assign(job, patch, {
    updatedAt: new Date().toISOString()
  });

  persistJob(job);
  emitJobUpdate(job);
  return job;
}

function addLog(jobId, message, type = "info", meta = {}) {
  const job = jobs.get(jobId);
  if (!job) return null;

  const log = {
    ts: new Date().toISOString(),
    type,
    message,
    ...meta
  };

  job.logs.push(log);
  job.updatedAt = new Date().toISOString();
  persistJob(job);
  job.emitter.emit("log", log);
  emitJobUpdate(job);

  const formattedMessage = `[job:${jobId}] ${message}`;
  if (type === "error") {
    logError(formattedMessage, meta);
  } else if (type === "warn") {
    logWarn(formattedMessage, meta);
  } else {
    logInfo(formattedMessage, meta);
  }

  return log;
}

function finishJob(jobId, result = {}) {
  return updateJob(jobId, {
    status: "completed",
    progress: 100,
    queuePosition: null,
    result,
    error: null
  });
}

function failJob(jobId, error) {
  return updateJob(jobId, {
    status: "failed",
    progress: 100,
    queuePosition: null,
    error: error?.message || String(error),
    result: null
  });
}

module.exports = {
  createJob,
  getJob,
  listJobs,
  loadJobsFromDisk,
  serializeJob,
  updateJob,
  addLog,
  finishJob,
  failJob
};
