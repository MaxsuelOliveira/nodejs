const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const {
  createJob,
  getJob,
  listJobs,
  loadJobsFromDisk,
  serializeJob,
  updateJob,
  addLog,
} = require("./jobs");
const { runScrapingJob } = require("./scraper");
const { LOG_FILE, logInfo, logWarn, logError } = require("./logger");

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_ROOT = path.resolve(__dirname, "..");
const ACTIVE_JOBS = new Set();
const SSE_CONNECTIONS = new Map();
const JOBS_ROOT = path.resolve(__dirname, "storage", "jobs");
const MAX_CONCURRENT_JOBS = Math.max(
  1,
  Number.parseInt(process.env.MAX_CONCURRENT_JOBS || "2", 10) || 2,
);
const QUEUE = [];
let REQUEST_SEQUENCE = 0;

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(
  "/assets",
  express.static(path.join(FRONTEND_ROOT, "assets"), {
    maxAge: "1h",
    fallthrough: false,
  }),
);

app.get(["/", "/index.html"], (req, res) => {
  res.sendFile(path.join(FRONTEND_ROOT, "index.html"));
});

app.use((req, res, next) => {
  const startedAt = Date.now();
  req.requestId = `req-${++REQUEST_SEQUENCE}`;
  res.setHeader("X-Request-Id", req.requestId);

  res.on("finish", () => {
    logInfo("HTTP request finalizada", {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });

  next();
});

loadJobsFromDisk();

function normalizeUrls(input) {
  if (!Array.isArray(input)) return [];

  return input.map((url) => String(url || "").trim()).filter(Boolean);
}

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function refreshQueuePositions() {
  QUEUE.forEach((queuedJobId, index) => {
    updateJob(queuedJobId, { queuePosition: index + 1 });
  });
}

function getJobEvidenceRoot(jobId) {
  return path.join(JOBS_ROOT, jobId, "evidence");
}

function isSafeChildPath(rootPath, candidatePath) {
  const normalizedRoot = path.resolve(rootPath);
  const normalizedCandidate = path.resolve(candidatePath);
  return (
    normalizedCandidate === normalizedRoot ||
    normalizedCandidate.startsWith(`${normalizedRoot}${path.sep}`)
  );
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function listFilesRecursively(rootPath) {
  if (!fs.existsSync(rootPath)) return [];

  const results = [];
  const stack = [rootPath];

  while (stack.length > 0) {
    const currentPath = stack.pop();
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }

      results.push(entryPath);
    }
  }

  return results;
}

function collectJobEvidence(jobId) {
  const evidenceRoot = getJobEvidenceRoot(jobId);
  if (!fs.existsSync(evidenceRoot)) {
    return {
      items: [],
      latest: null,
      summary: null,
    };
  }

  const grouped = new Map();
  const evidenceFiles = listFilesRecursively(evidenceRoot).filter(
    (filePath) => {
      return [".png", ".html", ".json"].includes(
        path.extname(filePath).toLowerCase(),
      );
    },
  );

  for (const absolutePath of evidenceFiles) {
    const ext = path.extname(absolutePath).toLowerCase();
    const basename = path.basename(absolutePath, ext);
    const relativePath = path
      .relative(evidenceRoot, absolutePath)
      .replaceAll("\\", "/");
    const item = grouped.get(basename) || {
      id: basename,
      capturedAt: null,
      screenshotUrl: null,
      htmlUrl: null,
      metadata: null,
      title: null,
    };

    const downloadUrl = `/api/jobs/${jobId}/evidence-file?path=${encodeURIComponent(relativePath)}`;

    if (ext === ".png") {
      item.screenshotUrl = downloadUrl;
    } else if (ext === ".html") {
      item.htmlUrl = downloadUrl;
    } else if (ext === ".json") {
      item.metadata = readJsonIfExists(absolutePath);
      item.capturedAt = item.metadata?.capturedAt || item.capturedAt;
      item.title = item.metadata?.title || item.title;
    }

    grouped.set(basename, item);
  }

  const items = Array.from(grouped.values())
    .sort((left, right) => {
      return (
        new Date(right.capturedAt || 0).getTime() -
        new Date(left.capturedAt || 0).getTime()
      );
    })
    .map((item) => ({
      ...item,
      protection: item.metadata?.protection || null,
    }));

  const latest = items[0] || null;
  const summary = latest?.protection
    ? {
        labels: latest.protection.labels || [],
        recommendedAction: latest.protection.recommendedAction || null,
        title: latest.title || null,
      }
    : null;

  return {
    items,
    latest,
    summary,
  };
}

function getClientContext(req) {
  return {
    ip: req.ip,
    userAgent: req.get("user-agent") || null,
    referer: req.get("referer") || null,
  };
}

function getSseSummary() {
  const connections = Array.from(SSE_CONNECTIONS.entries()).map(
    ([jobId, streamIds]) => ({
      jobId,
      activeConnections: streamIds.size,
    }),
  );

  return {
    totalActiveConnections: connections.reduce(
      (total, item) => total + item.activeConnections,
      0,
    ),
    jobs: connections,
  };
}

function getJobDebugState(job) {
  if (!job || !job.emitter) {
    return {
      activeSseConnections: job?.id
        ? SSE_CONNECTIONS.get(job.id)?.size || 0
        : 0,
      emitterListeners: {
        log: 0,
        update: 0,
      },
    };
  }

  return {
    activeSseConnections: SSE_CONNECTIONS.get(job.id)?.size || 0,
    emitterListeners: {
      log: job.emitter.listenerCount("log"),
      update: job.emitter.listenerCount("update"),
    },
  };
}

function openSseConnection(jobId, streamId) {
  const connections = SSE_CONNECTIONS.get(jobId) || new Set();
  connections.add(streamId);
  SSE_CONNECTIONS.set(jobId, connections);
}

function closeSseConnection(jobId, streamId) {
  const connections = SSE_CONNECTIONS.get(jobId);
  if (!connections) return;

  connections.delete(streamId);

  if (connections.size === 0) {
    SSE_CONNECTIONS.delete(jobId);
  }
}

function buildDiagnostics() {
  const jobs = listJobs();
  const counts = jobs.reduce(
    (accumulator, job) => {
      accumulator.total += 1;
      accumulator[job.status] = (accumulator[job.status] || 0) + 1;
      return accumulator;
    },
    { total: 0 },
  );

  return {
    pid: process.pid,
    cwd: process.cwd(),
    logFile: LOG_FILE,
    maxConcurrentJobs: MAX_CONCURRENT_JOBS,
    activeJobs: Array.from(ACTIVE_JOBS),
    queuedJobs: [...QUEUE],
    sse: getSseSummary(),
    counts,
    jobs: jobs.map((job) => ({
      id: job.id,
      status: job.status,
      progress: job.progress,
      queuePosition: job.queuePosition,
      url: job.payload?.url || job.payload?.urls?.[0] || null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      error: job.error || null,
      debug: getJobDebugState(job),
    })),
  };
}

function startJob(job) {
  ACTIVE_JOBS.add(job.id);
  updateJob(job.id, {
    status: "running",
    progress: Math.max(job.progress, 1),
    queuePosition: null,
  });

  logInfo("Worker iniciado", {
    jobId: job.id,
    activeJobs: Array.from(ACTIVE_JOBS),
    queueLength: QUEUE.length,
  });

  runScrapingJob(job)
    .catch((error) => {
      addLog(job.id, `Falha inesperada no worker: ${error.message}`, "error");
      updateJob(job.id, {
        status: "failed",
        error: error.message,
        progress: 100,
        queuePosition: null,
      });
      logError("Worker falhou", { jobId: job.id, error: error.message });
    })
    .finally(() => {
      ACTIVE_JOBS.delete(job.id);
      logInfo("Worker finalizado", {
        jobId: job.id,
        activeJobs: Array.from(ACTIVE_JOBS),
        queueLength: QUEUE.length,
      });
      tryStartNextJob();
    });
}

function scheduleJob(job) {
  if (ACTIVE_JOBS.size < MAX_CONCURRENT_JOBS) {
    startJob(job);
    return;
  }

  QUEUE.push(job.id);
  updateJob(job.id, {
    status: "queued",
    progress: 0,
    queuePosition: QUEUE.length,
  });
  refreshQueuePositions();
  addLog(job.id, `Job enfileirado. Posicao atual: ${QUEUE.length}`, "warn");

  logWarn("Job entrou na fila porque todos os workers estao ocupados", {
    jobId: job.id,
    queueLength: QUEUE.length,
    activeJobs: Array.from(ACTIVE_JOBS),
  });
}

function tryStartNextJob() {
  if (ACTIVE_JOBS.size >= MAX_CONCURRENT_JOBS) return;

  const nextJobId = QUEUE.shift();
  if (!nextJobId) return;

  refreshQueuePositions();

  const job = getJob(nextJobId);
  if (!job) {
    logWarn("Job removido da fila nao foi encontrado em memoria", {
      jobId: nextJobId,
    });
    tryStartNextJob();
    return;
  }

  startJob(job);
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    queue: QUEUE.length,
    activeJobs: ACTIVE_JOBS.size,
    maxConcurrentJobs: MAX_CONCURRENT_JOBS,
  });
});

app.get("/api/diagnostics", (req, res) => {
  return res.json({
    ok: true,
    diagnostics: buildDiagnostics(),
  });
});

app.post("/api/scrape", (req, res) => {
  const urls = normalizeUrls(req.body?.urls);

  if (!urls.length) {
    return res.status(400).json({
      ok: false,
      message: "Envie ao menos uma URL valida.",
    });
  }

  const invalid = urls.filter((url) => !isValidHttpUrl(url));
  if (invalid.length > 0) {
    return res.status(400).json({
      ok: false,
      message: "Ha URLs invalidas na requisicao.",
      invalid,
    });
  }

  logInfo("Recebida solicitacao de scraping", {
    totalUrls: urls.length,
    urls,
  });

  const jobs = urls.map((url) => {
    const job = createJob({
      url,
      urls: [url],
    });

    addLog(job.id, `Job criado para ${url}.`);
    scheduleJob(job);
    return serializeJob(job);
  });

  return res.status(202).json({
    ok: true,
    created: jobs.length,
    jobs,
    job: jobs[0],
    streamUrl: jobs[0] ? `/api/jobs/${jobs[0].id}/stream` : null,
    statusUrl: jobs[0] ? `/api/jobs/${jobs[0].id}` : null,
    downloadUrl: jobs[0] ? `/api/jobs/${jobs[0].id}/download` : null,
  });
});

app.get("/api/jobs", (req, res) => {
  return res.json({
    ok: true,
    jobs: listJobs(),
  });
});

app.get("/api/jobs/:jobId", (req, res) => {
  const job = getJob(req.params.jobId);

  if (!job) {
    return res.status(404).json({ ok: false, message: "Job nao encontrado." });
  }

  const evidence = collectJobEvidence(job.id);
  const debug = {
    requestId: req.requestId,
    ...getJobDebugState(job),
    totalActiveSseConnections: getSseSummary().totalActiveConnections,
  };

  logInfo("Detalhe de job consultado", {
    requestId: req.requestId,
    jobId: job.id,
    debug,
    client: getClientContext(req),
  });

  return res.json({
    ok: true,
    job: serializeJob(job),
    logs: job.logs,
    debug,
    evidence,
  });
});

app.get("/api/jobs/:jobId/evidence-file", (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ ok: false, message: "Job nao encontrado." });
  }

  const relativePath = String(req.query.path || "").trim();
  if (!relativePath) {
    return res
      .status(400)
      .json({ ok: false, message: "Informe o caminho relativo da evidencia." });
  }

  const evidenceRoot = getJobEvidenceRoot(job.id);
  const absolutePath = path.resolve(evidenceRoot, relativePath);

  if (
    !isSafeChildPath(evidenceRoot, absolutePath) ||
    !fs.existsSync(absolutePath)
  ) {
    return res
      .status(404)
      .json({ ok: false, message: "Arquivo de evidencia nao encontrado." });
  }

  return res.sendFile(absolutePath);
});

app.get("/api/jobs/:jobId/stream", (req, res) => {
  const job = getJob(req.params.jobId);

  if (!job) {
    return res.status(404).end();
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const streamId = `${req.requestId}-stream`;
  openSseConnection(job.id, streamId);

  logInfo("SSE aberto para job", {
    requestId: req.requestId,
    streamId,
    jobId: job.id,
    debug: {
      ...getJobDebugState(job),
      totalActiveSseConnections: getSseSummary().totalActiveConnections,
    },
    client: getClientContext(req),
  });

  const send = (eventName, payload) => {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  send("snapshot", {
    job: serializeJob(job),
    logs: job.logs,
  });

  const onLog = (entry) => send("log", entry);
  const onUpdate = (payload) => send("update", payload);

  job.emitter.on("log", onLog);
  job.emitter.on("update", onUpdate);

  const keepAlive = setInterval(() => {
    res.write(": ping\n\n");
  }, 15000);

  req.on("close", () => {
    clearInterval(keepAlive);
    job.emitter.off("log", onLog);
    job.emitter.off("update", onUpdate);
    closeSseConnection(job.id, streamId);
    res.end();
    logInfo("SSE fechado para job", {
      requestId: req.requestId,
      streamId,
      jobId: job.id,
      debug: {
        ...getJobDebugState(job),
        totalActiveSseConnections: getSseSummary().totalActiveConnections,
      },
    });
  });
});

app.get("/api/jobs/:jobId/download", (req, res) => {
  const job = getJob(req.params.jobId);

  if (!job) {
    return res.status(404).json({ ok: false, message: "Job nao encontrado." });
  }

  if (
    job.status !== "completed" ||
    job.progress !== 100 ||
    !job.result?.zipPath
  ) {
    return res.status(409).json({
      ok: false,
      message: "O ZIP ainda nao esta pronto para download.",
    });
  }

  if (!fs.existsSync(job.result.zipPath)) {
    return res.status(404).json({
      ok: false,
      message: "Arquivo ZIP nao encontrado no servidor.",
    });
  }

  logInfo("Download liberado", { jobId: job.id, zipPath: job.result.zipPath });
  return res.download(job.result.zipPath, `site-${job.id}.zip`);
});

app.listen(PORT, () => {
  logInfo(`Servidor rodando em http://localhost:${PORT}`, buildDiagnostics());
});
