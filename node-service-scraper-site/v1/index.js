const path = require("path");
const fs = require("fs");
const fsExtra = require("fs-extra");

async function startScraping(urls = []) {
  try {
    const scrape = (await import("website-scraper")).default;
    const PuppeteerPlugin = (await import("website-scraper-puppeteer")).default;

    for (const baseUrl of urls) {
      const domain = new URL(baseUrl).hostname.replace(/\./g, "-");
      const scrapedDir = path.resolve(__dirname, "scraped");
      const outputDir = path.join(scrapedDir, domain);

      if (!fs.existsSync(scrapedDir)) {
        fs.mkdirSync(scrapedDir, { recursive: true });
      }

      if (fs.existsSync(outputDir)) {
        console.log(`⚠️ Diretório do site já existe. Limpando: ${outputDir}`);
        fsExtra.removeSync(outputDir);
      }

      console.log(`🔍 Iniciando scraping em: ${baseUrl}`);

      await scrape({
        urls: [baseUrl], // ✅ Corrigido aqui
        directory: outputDir,
        plugins: [
          new PuppeteerPlugin({
            launchOptions: { headless: true },
            scrollToBottom: { timeout: 10000, viewportN: 10 },
          }),
        ],
      });

      console.log(`✅ Scraping finalizado para: ${baseUrl}`);
    }

    console.log("🎉 Todos os scrapings foram finalizados com sucesso!");
  } catch (error) {
    console.error("❌ Erro durante scraping:", error);
    throw error;
  }
}

const URLS = [
  "https://docy-jekyll-theme.netlify.app/?storefront=envato-elements",
];

startScraping(URLS)
  .then(() => {
    console.log("Scraping completed successfully.");
  })
  .catch((err) => console.error(err));
