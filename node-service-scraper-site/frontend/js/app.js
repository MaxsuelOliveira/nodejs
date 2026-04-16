const API_BASE = "http://localhost:3000";
const DRAFT_STORAGE_KEY = "scraperToolkit.urlsDraft";
const STATUS_LABELS = {
  pending: "Preparando",
  queued: "Na fila",
  running: "Em andamento",
  completed: "Pronto",
  failed: "Falhou",
};

const state = {
  jobs: new Map(),
  streams: new Map(),
  activeJobId: null,
  notifiedJobs: new Set(),
  refreshPromise: null,
  detailRequests: new Map(),
};

const urlsEl = document.getElementById("urls");
const startBtn = document.getElementById("startBtn");
const refreshJobsBtn = document.getElementById("refreshJobsBtn");
const clearUrlsBtn = document.getElementById("clearUrlsBtn");
const formNotice = document.getElementById("formNotice");
const projectEmptyState = document.getElementById("projectEmptyState");
const jobGrid = document.getElementById("jobGrid");
const jobModal = document.getElementById("jobModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const copyLogsBtn = document.getElementById("copyLogsBtn");
const modalDownloadLink = document.getElementById("modalDownloadLink");
const modalTitle = document.getElementById("modalTitle");
const modalSubtitle = document.getElementById("modalSubtitle");
const progressLabel = document.getElementById("progressLabel");
const progressFill = document.getElementById("progressFill");
const statusPill = document.getElementById("statusPill");
const jobId = document.getElementById("jobId");
const jobStatus = document.getElementById("jobStatus");
const siteCount = document.getElementById("siteCount");
const createdAtLabel = document.getElementById("createdAtLabel");
const evidencePanel = document.getElementById("evidencePanel");
const evidenceTitle = document.getElementById("evidenceTitle");
const evidenceLabels = document.getElementById("evidenceLabels");
const evidenceRecommendation = document.getElementById(
  "evidenceRecommendation",
);
const evidenceScreenshotLink = document.getElementById(
  "evidenceScreenshotLink",
);
const evidenceHtmlLink = document.getElementById("evidenceHtmlLink");
const modalEmptyState = document.getElementById("modalEmptyState");
const logBox = document.getElementById("logBox");

async function ensureNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";

  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

function notifyJobFinished(job) {
  if (!job || state.notifiedJobs.has(job.id)) return;
  if (!job.shouldNotify) return;
  if (!["completed", "failed"].includes(String(job.status || ""))) return;

  state.notifiedJobs.add(job.id);
  job.shouldNotify = false;

  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const isCompleted = job.status === "completed";
  const title = isCompleted ? "Scraping concluido" : "Scraping falhou";
  const body = isCompleted
    ? `${getJobTitle(job)} terminou e o ZIP ja pode ser baixado.`
    : `${getJobTitle(job)} terminou com erro. Abra o acompanhamento para ver os logs.`;

  const notification = new Notification(title, {
    body,
    tag: `scraper-job-${job.id}`,
    silent: false,
  });

  notification.onclick = () => {
    window.focus();
    openModal(job.id);
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(value) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsed);
}

function formatBytes(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return "-";

  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let index = 0;

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }

  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function getStatusLabel(status) {
  return STATUS_LABELS[String(status || "").toLowerCase()] || "Desconhecido";
}

function getJobUrls(job) {
  if (Array.isArray(job?.payload?.urls) && job.payload.urls.length) {
    return job.payload.urls;
  }

  if (job?.payload?.url) {
    return [job.payload.url];
  }

  return [];
}

function getPrimaryUrl(job) {
  return getJobUrls(job)[0] || "";
}

function getJobTitle(job) {
  const primaryUrl = getPrimaryUrl(job);
  if (!primaryUrl) return "Projeto sem URL";

  try {
    return new URL(primaryUrl).hostname.replace(/^www\./, "");
  } catch {
    return primaryUrl;
  }
}

function normalizeJob(job) {
  return {
    ...job,
    payload: job?.payload || {},
    evidence: job?.evidence || null,
    logs: Array.isArray(job?.logs) ? job.logs : [],
  };
}

function mergeJob(job, options = {}) {
  const preserveLogs = options.preserveLogs ?? true;
  const preserveEvidence = options.preserveEvidence ?? true;
  const existing = state.jobs.get(job.id);
  const normalized = normalizeJob(job);
  const merged = {
    ...existing,
    ...normalized,
  };

  if (preserveLogs && existing?.logs?.length && !job.logs?.length) {
    merged.logs = existing.logs;
  }

  if (preserveEvidence && existing?.evidence && !job.evidence) {
    merged.evidence = existing.evidence;
  }

  if (!Array.isArray(merged.logs)) {
    merged.logs = [];
  }

  merged.shouldNotify = Boolean(
    existing &&
    existing.status !== normalized.status &&
    ["completed", "failed"].includes(String(normalized.status || "")),
  );

  state.jobs.set(merged.id, merged);
  return merged;
}

function pushJobLog(jobIdValue, entry) {
  const job = state.jobs.get(jobIdValue);
  if (!job) return;

  const lastLog = job.logs[job.logs.length - 1];
  if (
    lastLog &&
    lastLog.ts === entry.ts &&
    lastLog.message === entry.message &&
    lastLog.type === entry.type
  ) {
    return;
  }

  job.logs = [...job.logs, entry];
  state.jobs.set(job.id, job);
}

function getSortedJobs() {
  return Array.from(state.jobs.values()).sort((left, right) => {
    return (
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
  });
}

function shouldStream(job) {
  return ["pending", "queued", "running"].includes(String(job?.status || ""));
}

function setNotice(message, type = "info") {
  if (!message) {
    formNotice.hidden = true;
    formNotice.textContent = "";
    formNotice.className = "notice";
    return;
  }

  formNotice.hidden = false;
  formNotice.textContent = message;
  formNotice.className = `notice notice-${type}`;
}

function setProgress(value) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  progressFill.style.width = `${safe}%`;
  progressLabel.textContent = `${safe}%`;
}

function createJobCard(job) {
  const progress = Math.max(0, Math.min(100, Number(job.progress) || 0));
  const downloadButton =
    job.status === "completed" && progress === 100 && job.result?.downloadPath
      ? `<a class="primary-btn" href="${escapeHtml(
          `${API_BASE}${job.result.downloadPath}`,
        )}" target="_blank" rel="noopener noreferrer">Baixar ZIP</a>`
      : "";

  return `
    <article class="job-card">
      <div class="job-head">
        <div>
          <h3 class="job-title">${escapeHtml(getJobTitle(job))}</h3>
          <p class="job-subtitle">${escapeHtml(getPrimaryUrl(job) || "Sem URL")}</p>
        </div>
        <span class="status-pill">${escapeHtml(getStatusLabel(job.status))}</span>
      </div>

      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progress}%"></div>
      </div>

      <p class="job-meta">
        ${escapeHtml(formatDate(job.createdAt))} | ${escapeHtml(formatBytes(job.result?.zipBytes))}
      </p>

      <div class="job-actions">
        <button class="secondary-btn" type="button" data-action="open-job" data-job-id="${escapeHtml(job.id)}">
          Acompanhar
        </button>
        ${downloadButton}
      </div>
    </article>
  `;
}

function renderJobs() {
  const jobs = getSortedJobs();

  if (!jobs.length) {
    jobGrid.innerHTML = "";
    projectEmptyState.hidden = false;
    return;
  }

  projectEmptyState.hidden = true;
  jobGrid.innerHTML = jobs.map(createJobCard).join("");

  for (const job of jobs) {
    notifyJobFinished(job);
  }
}

function renderEvidence(job) {
  const evidence = job?.evidence || null;
  const summary = evidence?.summary || null;
  const latest = evidence?.latest || null;

  if (!summary && !latest) {
    evidencePanel.hidden = true;
    evidenceTitle.textContent = "Sem bloqueio detectado";
    evidenceLabels.textContent = "Sem sinais";
    evidenceRecommendation.textContent =
      "Nenhuma evidencia capturada para este job.";
    evidenceScreenshotLink.hidden = true;
    evidenceHtmlLink.hidden = true;
    return;
  }

  evidencePanel.hidden = false;
  evidenceTitle.textContent =
    summary?.title || latest?.title || "Bloqueio detectado";
  evidenceLabels.textContent = (
    summary?.labels ||
    latest?.protection?.labels || ["sinais detectados"]
  ).join(", ");
  evidenceRecommendation.textContent =
    summary?.recommendedAction?.summary ||
    latest?.protection?.recommendedAction?.summary ||
    "Revise as evidencias capturadas para decidir a proxima acao.";

  if (latest?.screenshotUrl) {
    evidenceScreenshotLink.href = `${API_BASE}${latest.screenshotUrl}`;
    evidenceScreenshotLink.hidden = false;
  } else {
    evidenceScreenshotLink.hidden = true;
  }

  if (latest?.htmlUrl) {
    evidenceHtmlLink.href = `${API_BASE}${latest.htmlUrl}`;
    evidenceHtmlLink.hidden = false;
  } else {
    evidenceHtmlLink.hidden = true;
  }
}

function renderModal() {
  const job = state.activeJobId ? state.jobs.get(state.activeJobId) : null;

  if (!job) {
    modalTitle.textContent = "Projeto";
    modalSubtitle.textContent = "Logs e progresso do scraping.";
    statusPill.textContent = "Aguardando";
    jobId.textContent = "-";
    jobStatus.textContent = "-";
    siteCount.textContent = "0";
    createdAtLabel.textContent = "-";
    renderEvidence(null);
    modalDownloadLink.hidden = true;
    modalEmptyState.hidden = false;
    logBox.innerHTML = "";
    setProgress(0);
    return;
  }

  const logs = Array.isArray(job.logs) ? job.logs : [];

  modalTitle.textContent = getJobTitle(job);
  modalSubtitle.textContent = getPrimaryUrl(job) || "Projeto sem URL";
  statusPill.textContent = getStatusLabel(job.status);
  jobId.textContent = job.id;
  jobStatus.textContent = getStatusLabel(job.status);
  siteCount.textContent = String(getJobUrls(job).length);
  createdAtLabel.textContent = formatDate(job.createdAt);
  renderEvidence(job);
  setProgress(job.progress);

  if (
    job.status === "completed" &&
    Number(job.progress) === 100 &&
    job.result?.downloadPath
  ) {
    modalDownloadLink.href = `${API_BASE}${job.result.downloadPath}`;
    modalDownloadLink.hidden = false;
  } else {
    modalDownloadLink.hidden = true;
  }

  if (!logs.length) {
    modalEmptyState.hidden = false;
    logBox.innerHTML = "";
    return;
  }

  modalEmptyState.hidden = true;
  logBox.innerHTML = logs
    .map((entry) => {
      return `
        <div class="log-line">
          <span class="log-ts">[${escapeHtml(entry.ts || "-")}]</span>
          <span class="log-tag">${escapeHtml(entry.type || "info")}</span>
          <span>${escapeHtml(entry.message || "")}</span>
        </div>
      `;
    })
    .join("");

  logBox.scrollTop = logBox.scrollHeight;
}

function openModal(jobIdValue) {
  state.activeJobId = jobIdValue;
  jobModal.hidden = false;
  jobModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  renderModal();
  syncActiveJobStream();
}

function closeModal() {
  state.activeJobId = null;
  jobModal.hidden = true;
  jobModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  closeAllStreams();
  renderModal();
}

function closeStream(jobIdValue) {
  const stream = state.streams.get(jobIdValue);
  if (!stream) return;

  stream.close();
  state.streams.delete(jobIdValue);
}

function closeAllStreams(exceptJobId = null) {
  for (const streamJobId of Array.from(state.streams.keys())) {
    if (streamJobId === exceptJobId) continue;
    closeStream(streamJobId);
  }
}

function ensureStream(jobIdValue) {
  if (state.streams.has(jobIdValue)) return;

  const stream = new EventSource(`${API_BASE}/api/jobs/${jobIdValue}/stream`);
  state.streams.set(jobIdValue, stream);

  stream.addEventListener("snapshot", (event) => {
    const payload = JSON.parse(event.data);
    mergeJob({
      ...payload.job,
      logs: Array.isArray(payload.logs) ? payload.logs : [],
    });
    renderJobs();

    if (state.activeJobId === jobIdValue) {
      renderModal();
    }

    const currentJob = state.jobs.get(jobIdValue);
    if (currentJob && !shouldStream(currentJob)) {
      closeStream(jobIdValue);
    }
  });

  stream.addEventListener("log", (event) => {
    pushJobLog(jobIdValue, JSON.parse(event.data));

    if (state.activeJobId === jobIdValue) {
      renderModal();
    }
  });

  stream.addEventListener("update", (event) => {
    const currentJob = mergeJob(JSON.parse(event.data));
    renderJobs();

    if (state.activeJobId === jobIdValue) {
      renderModal();
    }

    if (!shouldStream(currentJob)) {
      void loadJobDetails(jobIdValue).catch(() => {});
      closeStream(jobIdValue);
    }
  });

  stream.onerror = () => {
    const currentJob = state.jobs.get(jobIdValue);
    if (!currentJob || !shouldStream(currentJob)) {
      closeStream(jobIdValue);
    }
  };
}

function syncActiveJobStream() {
  const activeJob = state.activeJobId
    ? state.jobs.get(state.activeJobId)
    : null;

  if (!activeJob || !shouldStream(activeJob)) {
    closeAllStreams();
    return;
  }

  closeAllStreams(activeJob.id);
  ensureStream(activeJob.id);
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.ok === false) {
    throw new Error(data.message || "Falha na comunicacao com a API.");
  }

  return data;
}

async function refreshJobs() {
  if (state.refreshPromise) {
    return state.refreshPromise;
  }

  state.refreshPromise = (async () => {
    const data = await fetchJson(`${API_BASE}/api/jobs`);
    const seenIds = new Set();

    for (const job of data.jobs || []) {
      mergeJob(job);
      seenIds.add(job.id);
    }

    for (const existingId of Array.from(state.jobs.keys())) {
      if (seenIds.has(existingId)) continue;
      closeStream(existingId);
      state.jobs.delete(existingId);
    }

    renderJobs();
    syncActiveJobStream();
  })();

  try {
    await state.refreshPromise;
  } finally {
    state.refreshPromise = null;
  }
}

async function loadJobDetails(jobIdValue) {
  if (state.detailRequests.has(jobIdValue)) {
    return state.detailRequests.get(jobIdValue);
  }

  const request = (async () => {
    const data = await fetchJson(`${API_BASE}/api/jobs/${jobIdValue}`);
    mergeJob(
      { ...data.job, logs: data.logs || [], evidence: data.evidence || null },
      { preserveLogs: false },
    );
    renderJobs();

    if (state.activeJobId === jobIdValue) {
      renderModal();
      syncActiveJobStream();
    }
  })();

  state.detailRequests.set(jobIdValue, request);

  try {
    await request;
  } finally {
    state.detailRequests.delete(jobIdValue);
  }
}

function restoreDraft() {
  const draft = window.localStorage.getItem(DRAFT_STORAGE_KEY);
  if (draft) {
    urlsEl.value = draft;
  }
}

function persistDraft() {
  window.localStorage.setItem(DRAFT_STORAGE_KEY, urlsEl.value);
}

function normalizeInputUrls() {
  return urlsEl.value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

async function handleStart() {
  const urls = normalizeInputUrls();

  if (!urls.length) {
    setNotice("Informe ao menos uma URL.", "error");
    return;
  }

  startBtn.disabled = true;
  setNotice("Criando os projetos...", "info");
  await ensureNotificationPermission();

  try {
    const data = await fetchJson(`${API_BASE}/api/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ urls }),
    });

    const createdJobs = Array.isArray(data.jobs)
      ? data.jobs
      : data.job
        ? [data.job]
        : [];

    for (const job of createdJobs) {
      mergeJob({ ...job, logs: [] }, { preserveLogs: false });
    }

    renderJobs();

    if (createdJobs[0]) {
      openModal(createdJobs[0].id);
      await loadJobDetails(createdJobs[0].id);
    }

    setNotice(
      createdJobs.length > 1
        ? `${createdJobs.length} sites enviados para download.`
        : "Site enviado para download.",
      "success",
    );
  } catch (error) {
    setNotice(error.message, "error");
  } finally {
    startBtn.disabled = false;
  }
}

urlsEl.addEventListener("input", persistDraft);
startBtn.addEventListener("click", handleStart);

refreshJobsBtn.addEventListener("click", async () => {
  try {
    await refreshJobs();
    setNotice("Lista atualizada.", "info");
  } catch (error) {
    setNotice(error.message, "error");
  }
});

clearUrlsBtn.addEventListener("click", () => {
  urlsEl.value = "";
  persistDraft();
  setNotice("", "info");
});

closeModalBtn.addEventListener("click", closeModal);

jobModal.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-modal='true']")) {
    closeModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !jobModal.hidden) {
    closeModal();
  }
});

copyLogsBtn.addEventListener("click", async () => {
  const activeJob = state.activeJobId
    ? state.jobs.get(state.activeJobId)
    : null;
  const text = activeJob?.logs
    ?.map((entry) => `[${entry.ts}] [${entry.type}] ${entry.message}`)
    .join("\n")
    .trim();

  if (!text) return;

  await navigator.clipboard.writeText(text);
  setNotice("Logs copiados.", "info");
});

jobGrid.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action='open-job']");
  if (!button) return;

  event.preventDefault();

  const targetJobId = button.getAttribute("data-job-id");
  if (!targetJobId) return;

  const isSameOpenJob = state.activeJobId === targetJobId && !jobModal.hidden;

  openModal(targetJobId);

  if (isSameOpenJob) {
    return;
  }

  try {
    await loadJobDetails(targetJobId);
  } catch (error) {
    setNotice(error.message, "error");
  }
});

async function initialize() {
  restoreDraft();
  renderJobs();
  renderModal();

  try {
    await refreshJobs();
  } catch (error) {
    setNotice(error.message, "error");
  }
}

initialize();
