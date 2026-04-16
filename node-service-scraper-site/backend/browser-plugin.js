const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

class BrowserPlugin {
  constructor({
    launchOptions = {},
    gotoOptions = {},
    scrollToBottom = null,
    pageSetup = null,
    captureDir = null,
    capturePrefix = "browser",
    detectProtection = false,
    failOnDetectedProtection = false,
  } = {}) {
    this.launchOptions = launchOptions;
    this.gotoOptions = gotoOptions;
    this.scrollToBottom = scrollToBottom;
    this.pageSetup = pageSetup;
    this.captureDir = captureDir;
    this.capturePrefix = capturePrefix;
    this.detectProtection = detectProtection;
    this.failOnDetectedProtection = failOnDetectedProtection;
    this.browser = null;
    this.headers = {};
  }

  apply(registerAction) {
    registerAction("beforeStart", async () => {
      this.browser = await puppeteer.launch(this.launchOptions);
    });

    registerAction("beforeRequest", async ({ requestOptions }) => {
      if (
        requestOptions?.headers &&
        Object.keys(requestOptions.headers).length > 0
      ) {
        this.headers = { ...requestOptions.headers };
      }

      return { requestOptions };
    });

    registerAction("afterResponse", async ({ response }) => {
      const contentType = response.headers["content-type"];
      const isHtml = contentType && contentType.split(";")[0] === "text/html";

      if (!isHtml) {
        return response.body;
      }

      const url = response.url;
      const page = await this.browser.newPage();
      let content = "";
      let title = "";

      try {
        if (typeof this.pageSetup === "function") {
          await this.pageSetup({ page, url, headers: this.headers });
        }

        if (this.headers && Object.keys(this.headers).length > 0) {
          await page.setExtraHTTPHeaders(this.headers);
        }

        await page.goto(url, this.gotoOptions);

        if (this.scrollToBottom) {
          await scrollToBottom(
            page,
            this.scrollToBottom.timeout,
            this.scrollToBottom.viewportN,
          );
        }

        content = await page.content();
        title = await page.title().catch(() => "");

        const protection = this.detectProtection
          ? detectProtectionSignals({ content, title, url })
          : null;

        if (protection?.detected) {
          const artifacts = await captureArtifacts({
            page,
            captureDir: this.captureDir,
            capturePrefix: this.capturePrefix,
            reason: protection.blocking
              ? "protection"
              : "suspicious-protection",
            url,
            title,
            content,
            protection,
          });

          if (this.failOnDetectedProtection && protection.blocking) {
            const error = new Error(
              `Protection challenge detectada em ${url}: ${protection.labels.join(", ")}`,
            );
            error.code = "PROTECTION_CHALLENGE_DETECTED";
            error.protection = protection;
            error.browserArtifacts = artifacts;
            throw error;
          }
        }

        return Buffer.from(content).toString("binary");
      } catch (error) {
        if (!error.protection && this.detectProtection) {
          const protectionContent =
            content || (await page.content().catch(() => "")) || "";
          const protectionTitle =
            title || (await page.title().catch(() => "")) || "";
          const protection = detectProtectionSignals({
            content: protectionContent,
            title: protectionTitle,
            url,
          });

          if (protection.detected) {
            error.protection = protection;
            if (!error.code && protection.blocking) {
              error.code = "PROTECTION_CHALLENGE_DETECTED";
            }
          }
        }

        if (!error.browserArtifacts) {
          error.browserArtifacts = await captureArtifacts({
            page,
            captureDir: this.captureDir,
            capturePrefix: this.capturePrefix,
            reason: error.code || "navigation-failure",
            url,
            title,
            content,
            protection: error.protection || null,
          });
        }

        throw error;
      } finally {
        await page.close();
      }
    });

    registerAction("afterFinish", async () => {
      if (this.browser) {
        await this.browser.close();
      }
    });
  }
}

function detectProtectionSignals({ content = "", title = "", url = "" }) {
  const titleText = String(title || "").toLowerCase();
  const htmlText = String(content || "").toLowerCase();
  const visibleText = extractVisibleText(content).toLowerCase();
  const urlText = String(url || "").toLowerCase();
  const labels = [];

  const hasCloudflare =
    /cloudflare|cf-browser-verification|attention required|checking your browser|cf-challenge/i.test(
      `${titleText}\n${visibleText}\n${htmlText}`,
    );
  const hasVisibleCaptchaText = /captcha|g-recaptcha|hcaptcha|recaptcha/i.test(
    `${titleText}\n${visibleText}`,
  );
  const hasVisibleHumanVerification =
    /verify you are human|are you human|human verification|security check|please verify/i.test(
      `${titleText}\n${visibleText}`,
    );
  const hasAccessDenied =
    /access denied|request blocked|temporarily unavailable/i.test(
      `${titleText}\n${visibleText}`,
    );
  const hasChallengeUrl = /\/challenge\b|\/checkpoint\b/.test(urlText);
  const hasChallengeMarkup =
    /<(iframe|div|form)[^>]+(?:captcha|recaptcha|hcaptcha|cf-challenge|challenge-form)/i.test(
      content,
    );
  const hasBenignShopifyCaptchaBootstrap =
    /<script[^>]+id=["']captcha-bootstrap["']/i.test(content);
  const hasBenignShopifyHCaptchaReference =
    /shopifycloud\/storefront-forms-hcaptcha|protected by hcaptcha/i.test(
      htmlText,
    );

  if (hasCloudflare) {
    labels.push("cloudflare");
  }

  if (hasVisibleHumanVerification) {
    labels.push("human-verification");
  }

  if (hasAccessDenied) {
    labels.push("access-denied");
  }

  const hasStrongCaptchaSignal =
    hasVisibleCaptchaText ||
    (hasChallengeMarkup &&
      !(
        hasBenignShopifyCaptchaBootstrap &&
        !hasVisibleCaptchaText &&
        !hasVisibleHumanVerification &&
        !hasChallengeUrl
      ));

  if (hasStrongCaptchaSignal) {
    labels.push("captcha");
  }

  if (hasChallengeUrl) {
    labels.push("shopify-challenge");
  }

  if (
    labels.length === 0 &&
    (hasBenignShopifyCaptchaBootstrap || hasBenignShopifyHCaptchaReference)
  ) {
    labels.push("shopify-captcha-script");
  }

  const uniqueLabels = [...new Set(labels)];
  const blocking = uniqueLabels.some(isBlockingProtectionLabel);

  return {
    detected: uniqueLabels.length > 0,
    labels: uniqueLabels,
    url,
    title,
    blocking,
    suspicious: uniqueLabels.includes("shopify-captcha-script"),
    recommendedAction: getRecommendedAction(uniqueLabels),
  };
}

function getRecommendedAction(labels = []) {
  if (labels.includes("shopify-captcha-script")) {
    return {
      type: "inspect-shopify-captcha-script",
      summary:
        "A Shopify inclui scripts de captcha para formularios em paginas normais. Trate como suspeita e nao como bloqueio por si so.",
    };
  }

  if (labels.includes("captcha") || labels.includes("human-verification")) {
    return {
      type: "manual-or-non-headless",
      summary:
        "Tente perfil protegido com sessao persistente e considere rodar com PROTECTED_BROWSER_HEADLESS=false.",
    };
  }

  if (labels.includes("cloudflare")) {
    return {
      type: "protected-browser",
      summary:
        "Tente perfil protegido com sessao persistente, headers reforcados e navegador nao headless se necessario.",
    };
  }

  if (labels.includes("shopify-challenge")) {
    return {
      type: "shopify-protected-browser",
      summary:
        "Tente perfil protegido com sessao persistente e, se persistir, rode com headless desligado para resolver o desafio.",
    };
  }

  if (labels.includes("access-denied")) {
    return {
      type: "fallback-or-identity",
      summary:
        "O site bloqueou o acesso. Revise identidade do navegador, cookies e possivel necessidade de proxy.",
    };
  }

  return {
    type: "inspect-evidence",
    summary:
      "Revise o HTML e o screenshot capturados para decidir o proximo perfil ou fallback.",
  };
}

async function captureArtifacts({
  page,
  captureDir,
  capturePrefix,
  reason,
  url,
  title,
  content,
  protection,
}) {
  if (!captureDir) {
    return null;
  }

  fs.mkdirSync(captureDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[.:]/g, "-");
  const safeReason = sanitizeFilePart(reason || "capture");
  const safePrefix = sanitizeFilePart(capturePrefix || "browser");
  const screenshotPath = path.join(
    captureDir,
    `${safePrefix}-${stamp}-${safeReason}.png`,
  );
  const htmlPath = path.join(
    captureDir,
    `${safePrefix}-${stamp}-${safeReason}.html`,
  );
  const metadataPath = path.join(
    captureDir,
    `${safePrefix}-${stamp}-${safeReason}.json`,
  );

  let finalTitle = title || "";
  let finalContent = content || "";

  if (!finalTitle) {
    finalTitle = await page.title().catch(() => "");
  }

  if (!finalContent) {
    finalContent = await page.content().catch(() => "");
  }

  const screenshotSaved = await page
    .screenshot({ path: screenshotPath, fullPage: true })
    .then(() => true)
    .catch(() => false);

  const htmlDocument = [
    "<!-- Browser capture metadata -->",
    `<!-- URL: ${url || ""} -->`,
    `<!-- Title: ${finalTitle || ""} -->`,
    finalContent,
  ].join("\n");

  await fs.promises.writeFile(htmlPath, htmlDocument, "utf8");
  await fs.promises.writeFile(
    metadataPath,
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        reason,
        url: url || null,
        title: finalTitle || null,
        protection: protection || null,
        screenshotPath: screenshotSaved ? screenshotPath : null,
        htmlPath,
      },
      null,
      2,
    ),
    "utf8",
  );

  return {
    screenshotPath: screenshotSaved ? screenshotPath : null,
    htmlPath,
    metadataPath,
    title: finalTitle || null,
    protection: protection || null,
  };
}

function sanitizeFilePart(value) {
  return String(value || "capture")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function isBlockingProtectionLabel(label) {
  return label !== "shopify-captcha-script";
}

function extractVisibleText(content = "") {
  return String(content || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function scrollToBottom(page, timeout, viewportN) {
  await page.evaluate(
    async (scrollTimeout, scrollViewportN) => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        let iterations = 0;
        const distance = 200;
        const maxHeight = window.innerHeight * scrollViewportN;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          iterations += 1;

          if (totalHeight >= maxHeight || iterations * 100 >= scrollTimeout) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    },
    timeout,
    viewportN,
  );
}

module.exports = BrowserPlugin;
