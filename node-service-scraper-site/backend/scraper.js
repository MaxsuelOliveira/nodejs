const fs = require("fs");
const path = require("path");
const fsExtra = require("fs-extra");
const BrowserPlugin = require("./browser-plugin");
const { addLog, updateJob, finishJob, failJob } = require("./jobs");
const { zipDirectory } = require("./zip");

const SCRAPE_TIMEOUT_MS = Number.parseInt(
  process.env.SCRAPE_TIMEOUT_MS || "180000",
  10,
);
const HEARTBEAT_INTERVAL_MS = Number.parseInt(
  process.env.SCRAPE_HEARTBEAT_INTERVAL_MS || "15000",
  10,
);
const REQUEST_TIMEOUT_MS = Number.parseInt(
  process.env.SCRAPE_REQUEST_TIMEOUT_MS || "30000",
  10,
);
const SHOPIFY_STATIC_TIMEOUT_MS = Number.parseInt(
  process.env.SHOPIFY_STATIC_TIMEOUT_MS || "45000",
  10,
);
const SHOPIFY_STATIC_REQUEST_TIMEOUT_MS = Number.parseInt(
  process.env.SHOPIFY_STATIC_REQUEST_TIMEOUT_MS || "15000",
  10,
);
const PROTECTED_BROWSER_HEADLESS = parseBooleanEnv(
  process.env.PROTECTED_BROWSER_HEADLESS,
  true,
);
const PERSIST_BROWSER_SESSION = parseBooleanEnv(
  process.env.PERSIST_BROWSER_SESSION,
  true,
);
const PROTECTED_BROWSER_SESSION_ROOT = path.resolve(
  __dirname,
  "storage",
  "browser-sessions",
);
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

function parseBooleanEnv(value, fallback) {
  if (value == null) return fallback;

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function sanitizeHostname(urlString) {
  const hostname = new URL(urlString).hostname;
  return hostname.replace(/[^a-zA-Z0-9.-]/g, "").replace(/\./g, "-");
}

function withTimeout(promise, timeoutMs, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(`${label} excedeu o tempo limite de ${timeoutMs / 1000}s.`),
        );
      }, timeoutMs);
    }),
  ]);
}

function startHeartbeat(jobId, url) {
  const startedAt = Date.now();

  return setInterval(() => {
    const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);
    addLog(
      jobId,
      `Scraping ainda em andamento para ${url}. Tempo decorrido: ${elapsedSeconds}s.`,
      "warn",
    );
  }, HEARTBEAT_INTERVAL_MS);
}

function isRetriableBrowserError(error) {
  const message = String(error?.message || "");

  return (
    message.includes("ERR_BLOCKED_BY_CLIENT") ||
    message.includes("Navigation") ||
    message.includes("Target closed") ||
    message.includes("Protocol error") ||
    message.includes("ERR_FAILED")
  );
}

function isBlockedByClientError(error) {
  return String(error?.message || "").includes("ERR_BLOCKED_BY_CLIENT");
}

function isProtectionChallengeError(error) {
  return (
    error?.code === "PROTECTION_CHALLENGE_DETECTED" ||
    Boolean(error?.protection?.detected)
  );
}

function isShopifyDomain(urlString) {
  try {
    const hostname = new URL(urlString).hostname.toLowerCase();
    return hostname === "myshopify.com" || hostname.endsWith(".myshopify.com");
  } catch {
    return false;
  }
}

function getStaticFallbackProfile(baseUrl) {
  if (isShopifyDomain(baseUrl)) {
    return {
      recursive: true,
      maxRecursiveDepth: 1,
      maxDepth: 2,
      requestConcurrency: 1,
      requestTimeoutMs: SHOPIFY_STATIC_REQUEST_TIMEOUT_MS,
      totalTimeoutMs: SHOPIFY_STATIC_TIMEOUT_MS,
    };
  }

  return {
    recursive: true,
    maxRecursiveDepth: 3,
    maxDepth: null,
    requestConcurrency: 2,
    requestTimeoutMs: REQUEST_TIMEOUT_MS,
    totalTimeoutMs: SCRAPE_TIMEOUT_MS,
  };
}

function describeProtection(protection) {
  if (!protection?.detected) {
    return null;
  }

  return protection.labels.join(", ");
}

function getProtectionLogMessage(protection, baseUrl, label) {
  const protectionDetails = describeProtection(protection);
  if (!protectionDetails) {
    return null;
  }

  if (protection.blocking) {
    return `${label} com sinais de protecao em ${baseUrl}: ${protectionDetails}.`;
  }

  return `${label} com suspeita de protecao em ${baseUrl}: ${protectionDetails}.`;
}

function logEvidenceForError(
  jobId,
  baseUrl,
  error,
  label = "Falha de navegador",
) {
  const protectionMessage = getProtectionLogMessage(
    error?.protection,
    baseUrl,
    label,
  );

  if (protectionMessage) {
    addLog(jobId, protectionMessage, "warn");
  }

  if (
    error?.browserArtifacts?.screenshotPath ||
    error?.browserArtifacts?.htmlPath
  ) {
    addLog(
      jobId,
      `${label} com evidencias salvas em screenshot=${error.browserArtifacts.screenshotPath || "-"} html=${error.browserArtifacts.htmlPath || "-"}.`,
      "warn",
    );
  }
}

async function resetOutputDir(outputDir) {
  await fsExtra.remove(outputDir);
}

function createStealthPageSetup(baseUrl, browserProfile) {
  const shopifyDomain = isShopifyDomain(baseUrl);

  return async ({ page, headers }) => {
    await page.setViewport({ width: 1366, height: 768 });
    await page.setJavaScriptEnabled(true);
    await page.setBypassCSP(true);

    const userAgent = headers?.["user-agent"] || DEFAULT_USER_AGENT;
    await page.setUserAgent(userAgent);

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => false,
      });

      Object.defineProperty(navigator, "languages", {
        get: () => ["pt-BR", "pt", "en-US", "en"],
      });

      Object.defineProperty(navigator, "plugins", {
        get: () => [1, 2, 3, 4, 5],
      });

      window.chrome = {
        runtime: {},
      };

      const originalQuery = window.navigator.permissions?.query;
      if (originalQuery) {
        window.navigator.permissions.query = (parameters) => {
          if (parameters?.name === "notifications") {
            return Promise.resolve({ state: Notification.permission });
          }

          return originalQuery(parameters);
        };
      }
    });

    if (shopifyDomain || browserProfile === "retry") {
      await page.setExtraHTTPHeaders({
        ...(headers || {}),
        "upgrade-insecure-requests": "1",
        "sec-ch-ua":
          '"Microsoft Edge";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
      });
    }
  };
}

function getBrowserScrapeProfile(
  baseUrl,
  browserProfile = "primary",
  sessionDir = null,
) {
  const shopifyDomain = isShopifyDomain(baseUrl);

  if (browserProfile === "protected") {
    return {
      launchOptions: {
        headless: PROTECTED_BROWSER_HEADLESS ? "new" : false,
        ignoreDefaultArgs: ["--enable-automation"],
        userDataDir: PERSIST_BROWSER_SESSION ? sessionDir : undefined,
        args: [
          "--disable-blink-features=AutomationControlled",
          "--disable-features=IsolateOrigins,site-per-process",
          "--disable-popup-blocking",
          "--window-size=1440,900",
        ],
      },
      gotoOptions: {
        waitUntil: "networkidle2",
        timeout: REQUEST_TIMEOUT_MS,
      },
      scrollToBottom: {
        timeout: 6000,
        viewportN: 5,
      },
    };
  }

  if (shopifyDomain && browserProfile === "primary") {
    return {
      launchOptions: {
        headless: "new",
        ignoreDefaultArgs: ["--enable-automation"],
        args: [
          "--disable-blink-features=AutomationControlled",
          "--disable-features=IsolateOrigins,site-per-process",
          "--window-size=1366,768",
        ],
      },
      gotoOptions: {
        waitUntil: "networkidle2",
        timeout: REQUEST_TIMEOUT_MS,
      },
      scrollToBottom: {
        timeout: 5000,
        viewportN: 4,
      },
    };
  }

  if (shopifyDomain || browserProfile === "retry") {
    return {
      launchOptions: {
        headless: "new",
        ignoreDefaultArgs: ["--enable-automation"],
        args: [
          "--disable-blink-features=AutomationControlled",
          "--disable-popup-blocking",
          "--disable-background-networking",
          "--disable-features=site-per-process",
          "--window-size=1366,768",
        ],
      },
      gotoOptions: {
        waitUntil: "load",
        timeout: REQUEST_TIMEOUT_MS,
      },
      scrollToBottom: {
        timeout: 4000,
        viewportN: 3,
      },
    };
  }

  if (browserProfile === "retry") {
    return {
      launchOptions: {
        headless: true,
        args: [
          "--disable-extensions",
          "--disable-popup-blocking",
          "--disable-background-networking",
          "--disable-features=site-per-process",
        ],
      },
      gotoOptions: {
        waitUntil: "load",
        timeout: REQUEST_TIMEOUT_MS,
      },
      scrollToBottom: {
        timeout: 4000,
        viewportN: 3,
      },
    };
  }

  return {
    launchOptions: {
      headless: true,
      args: [
        "--disable-extensions",
        "--disable-features=IsolateOrigins,site-per-process",
      ],
    },
    gotoOptions: {
      waitUntil: "domcontentloaded",
      timeout: REQUEST_TIMEOUT_MS,
    },
    scrollToBottom: {
      timeout: 7000,
      viewportN: 6,
    },
  };
}

function buildScrapeOptions({
  baseUrl,
  outputDir,
  useBrowser,
  browserProfile = "primary",
  captureDir = null,
  capturePrefix = "browser",
  sessionDir = null,
}) {
  const staticFallbackProfile = getStaticFallbackProfile(baseUrl);
  const options = {
    urls: [baseUrl],
    directory: outputDir,
    recursive: useBrowser ? true : staticFallbackProfile.recursive,
    maxRecursiveDepth: useBrowser ? 3 : staticFallbackProfile.maxRecursiveDepth,
    maxDepth: useBrowser ? null : staticFallbackProfile.maxDepth,
    filenameGenerator: "bySiteStructure",
    prettifyUrls: true,
    requestConcurrency: useBrowser
      ? 2
      : staticFallbackProfile.requestConcurrency,
    request: {
      timeout: {
        request: useBrowser
          ? REQUEST_TIMEOUT_MS
          : staticFallbackProfile.requestTimeoutMs,
      },
      https: {
        rejectUnauthorized: false,
      },
      headers: {
        "user-agent": DEFAULT_USER_AGENT,
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    },
  };

  if (!useBrowser) {
    return options;
  }
  const profile = getBrowserScrapeProfile(baseUrl, browserProfile, sessionDir);

  return {
    ...options,
    plugins: [
      new BrowserPlugin({
        launchOptions: profile.launchOptions,
        gotoOptions: profile.gotoOptions,
        scrollToBottom: profile.scrollToBottom,
        pageSetup: createStealthPageSetup(baseUrl, browserProfile),
        captureDir,
        capturePrefix,
        detectProtection: true,
        failOnDetectedProtection: true,
      }),
    ],
  };
}

async function runBrowserAttempt({
  scrape,
  baseUrl,
  outputDir,
  browserProfile,
  timeoutLabel,
  captureDir,
  capturePrefix,
  sessionDir,
}) {
  return withTimeout(
    scrape(
      buildScrapeOptions({
        baseUrl,
        outputDir,
        useBrowser: true,
        browserProfile,
        captureDir,
        capturePrefix,
        sessionDir,
      }),
    ),
    SCRAPE_TIMEOUT_MS,
    timeoutLabel,
  );
}

async function runStaticAttempt({ scrape, baseUrl, outputDir, timeoutLabel }) {
  const staticFallbackProfile = getStaticFallbackProfile(baseUrl);

  return withTimeout(
    scrape(
      buildScrapeOptions({
        baseUrl,
        outputDir,
        useBrowser: false,
      }),
    ),
    staticFallbackProfile.totalTimeoutMs,
    timeoutLabel,
  );
}

async function runScrapingJob(job) {
  const urls = Array.isArray(job.payload?.urls) ? job.payload.urls : [];

  try {
    updateJob(job.id, { status: "running", progress: 2 });
    addLog(job.id, `Job iniciado com ${urls.length} URL(s).`);

    const scrape = (await import("website-scraper")).default;

    const jobRoot = path.resolve(__dirname, "storage", "jobs", job.id);
    const scrapedRoot = path.join(jobRoot, "scraped");
    const zipRoot = path.join(jobRoot, "zip");
    const evidenceRoot = path.join(jobRoot, "evidence");
    const zipFilePath = path.join(zipRoot, `site-${job.id}.zip`);

    await fs.promises.mkdir(scrapedRoot, { recursive: true });
    await fs.promises.mkdir(evidenceRoot, { recursive: true });
    await fs.promises.mkdir(PROTECTED_BROWSER_SESSION_ROOT, {
      recursive: true,
    });

    for (let index = 0; index < urls.length; index += 1) {
      const baseUrl = urls[index];
      const domain = sanitizeHostname(baseUrl);
      const outputDir = path.join(scrapedRoot, domain);
      const captureDir = path.join(evidenceRoot, domain);
      const sessionDir = path.join(PROTECTED_BROWSER_SESSION_ROOT, domain);

      await fs.promises.mkdir(captureDir, { recursive: true });
      if (PERSIST_BROWSER_SESSION) {
        await fs.promises.mkdir(sessionDir, { recursive: true });
      }

      if (fs.existsSync(outputDir)) {
        addLog(
          job.id,
          `Diretorio existente encontrado. Limpando: ${outputDir}`,
          "warn",
        );
        await fsExtra.remove(outputDir);
      }

      addLog(job.id, `Iniciando scraping em: ${baseUrl}`);
      addLog(
        job.id,
        `Timeout configurado: ${Math.round(SCRAPE_TIMEOUT_MS / 1000)}s por site.`,
        "info",
      );

      updateJob(job.id, {
        progress: Math.max(5, Math.round((index / urls.length) * 80)),
      });

      const heartbeat = startHeartbeat(job.id, baseUrl);

      try {
        try {
          if (isShopifyDomain(baseUrl)) {
            addLog(
              job.id,
              `Dominio Shopify detectado. Tentando modo navegador reforcado antes do fallback estatico.`,
              "info",
            );
          }

          await runBrowserAttempt({
            scrape,
            baseUrl,
            outputDir,
            browserProfile: "primary",
            timeoutLabel: `Scraping de ${baseUrl}`,
            captureDir,
            capturePrefix: `${domain}-primary`,
            sessionDir,
          });
        } catch (error) {
          logEvidenceForError(
            job.id,
            baseUrl,
            error,
            "Primeira tentativa de navegador",
          );

          if (
            !isRetriableBrowserError(error) &&
            !isProtectionChallengeError(error)
          ) {
            throw error;
          }

          const shouldTryProtectedProfile =
            isShopifyDomain(baseUrl) ||
            isProtectionChallengeError(error) ||
            isBlockedByClientError(error);

          if (shouldTryProtectedProfile) {
            addLog(
              job.id,
              `Ativando perfil protegido para ${baseUrl}. Sessao persistente=${PERSIST_BROWSER_SESSION ? "sim" : "nao"} em ${PERSIST_BROWSER_SESSION ? sessionDir : "desabilitada"} e headless=${PROTECTED_BROWSER_HEADLESS ? "sim" : "nao"}.`,
              "info",
            );

            await resetOutputDir(outputDir);

            try {
              await runBrowserAttempt({
                scrape,
                baseUrl,
                outputDir,
                browserProfile: "protected",
                timeoutLabel: `Perfil protegido de ${baseUrl}`,
                captureDir,
                capturePrefix: `${domain}-protected`,
                sessionDir,
              });
            } catch (protectedError) {
              logEvidenceForError(
                job.id,
                baseUrl,
                protectedError,
                "Perfil protegido",
              );

              await resetOutputDir(outputDir);

              addLog(
                job.id,
                `Perfil protegido falhou em ${baseUrl}: ${protectedError.message}`,
                "warn",
              );

              if (isShopifyDomain(baseUrl)) {
                const staticFallbackProfile = getStaticFallbackProfile(baseUrl);
                addLog(
                  job.id,
                  `Perfil Shopify no fallback: profundidade HTML ${staticFallbackProfile.maxRecursiveDepth}, timeout total ${Math.round(staticFallbackProfile.totalTimeoutMs / 1000)}s e timeout por request ${Math.round(staticFallbackProfile.requestTimeoutMs / 1000)}s.`,
                  "info",
                );
              }

              addLog(
                job.id,
                `Tentando fallback estatico para ${baseUrl}.`,
                "warn",
              );

              await runStaticAttempt({
                scrape,
                baseUrl,
                outputDir,
                timeoutLabel: `Fallback estatico de ${baseUrl}`,
              });
            }

            updateJob(job.id, {
              progress: Math.round(((index + 1) / urls.length) * 80),
            });
            addLog(job.id, `Scraping finalizado para: ${baseUrl}`, "success");
            continue;
          }

          addLog(
            job.id,
            `Primeira tentativa com Puppeteer falhou em ${baseUrl}: ${error.message}`,
            "warn",
          );

          await resetOutputDir(outputDir);

          try {
            addLog(
              job.id,
              `Iniciando segunda tentativa com um novo contexto do navegador para ${baseUrl}.`,
              "warn",
            );

            await runBrowserAttempt({
              scrape,
              baseUrl,
              outputDir,
              browserProfile: "retry",
              timeoutLabel: `Segunda tentativa de ${baseUrl}`,
              captureDir,
              capturePrefix: `${domain}-retry`,
              sessionDir,
            });
          } catch (retryError) {
            logEvidenceForError(
              job.id,
              baseUrl,
              retryError,
              "Segunda tentativa de navegador",
            );

            addLog(
              job.id,
              `Segunda tentativa com Puppeteer falhou em ${baseUrl}: ${retryError.message}`,
              "warn",
            );

            await resetOutputDir(outputDir);

            addLog(
              job.id,
              `Tentando fallback estatico para ${baseUrl}.`,
              "warn",
            );

            if (isShopifyDomain(baseUrl)) {
              const staticFallbackProfile = getStaticFallbackProfile(baseUrl);
              addLog(
                job.id,
                `Perfil Shopify no fallback: profundidade HTML ${staticFallbackProfile.maxRecursiveDepth}, timeout total ${Math.round(staticFallbackProfile.totalTimeoutMs / 1000)}s e timeout por request ${Math.round(staticFallbackProfile.requestTimeoutMs / 1000)}s.`,
                "info",
              );
            }

            await runStaticAttempt({
              scrape,
              baseUrl,
              outputDir,
              timeoutLabel: `Fallback estatico de ${baseUrl}`,
            });
          }
        }
      } finally {
        clearInterval(heartbeat);
      }

      updateJob(job.id, {
        progress: Math.round(((index + 1) / urls.length) * 80),
      });
      addLog(job.id, `Scraping finalizado para: ${baseUrl}`, "success");
    }

    addLog(job.id, "Compactando arquivos em ZIP...");
    updateJob(job.id, { progress: 90 });

    const zipInfo = await zipDirectory(scrapedRoot, zipFilePath);

    addLog(
      job.id,
      `ZIP gerado com sucesso. Total de bytes: ${zipInfo.bytes}`,
      "success",
    );
    finishJob(job.id, {
      zipPath: zipInfo.zipPath,
      zipBytes: zipInfo.bytes,
      downloadPath: `/api/jobs/${job.id}/download`,
    });
    addLog(job.id, "Processo concluido com sucesso.", "success");
  } catch (error) {
    addLog(job.id, `Erro durante scraping: ${error.message}`, "error");
    failJob(job.id, error);
  }
}

module.exports = { runScrapingJob };
