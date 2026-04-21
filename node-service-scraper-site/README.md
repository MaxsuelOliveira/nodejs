# ScraperToolKit

Projeto completo com:

- frontend com formulário bonito e minimalista
- painel de logs em tempo real
- barra de progresso
- botão para download do ZIP final
- captura de screenshot e HTML bruto quando o navegador encontra bloqueios
- backend em Express
- SSE para stream de logs
- scraping com `website-scraper` + `website-scraper-puppeteer`
- compactação com `archiver`
- persistência simples em `backend/storage/jobs/<jobId>`

## Estrutura

```txt
node-service-scraper-site/
  backend/
    package.json
    server.js
    scraper.js
    jobs.js
    zip.js
    storage/jobs/
  index.html
  assets/
    css/styles.css
    js/app.js
  README.md
```

## Requisitos

- Node.js 18+
- npm

## Instalação

```bash
cd backend
npm install
```

## Executar backend

```bash
npm run dev
```

Servidor padrão:

```txt
http://localhost:3000
```

## Executar frontend

O frontend agora e servido diretamente pelo backend.

Com o backend rodando, abra:

```txt
http://localhost:3000
```

As importacoes de CSS/JS usam:

- `/assets/css/styles.css`
- `/assets/js/app.js`

E as chamadas da API usam a mesma origem do navegador.

## Fluxo da aplicação

1. frontend envia `POST /api/scrape`
2. backend cria um `jobId`
3. frontend conecta em `GET /api/jobs/:jobId/stream`
4. backend transmite logs e progresso via SSE
5. scraping é salvo em `backend/storage/jobs/<jobId>/scraped`
6. o ZIP final é gerado em `backend/storage/jobs/<jobId>/zip`
7. frontend libera o botão de download

## Endpoints

### Healthcheck

```http
GET /api/health
```

### Criar job

```http
POST /api/scrape
Content-Type: application/json

{
  "urls": [
    "https://exemplo.com",
    "https://docs.exemplo.com"
  ]
}
```

### Consultar job

```http
GET /api/jobs/:jobId
```

Esse endpoint agora tambem retorna:

- `evidence.latest` com links para screenshot e HTML bruto mais recentes
- `evidence.summary` com classificacao do bloqueio e recomendacao automatica

### Abrir arquivo de evidencia

```http
GET /api/jobs/:jobId/evidence-file?path=<caminho-relativo>
```

### Stream SSE

```http
GET /api/jobs/:jobId/stream
```

### Download do ZIP

```http
GET /api/jobs/:jobId/download
```

## Observações técnicas

- há uma fila simples com concorrência limitada a 1 job por vez
- o scraping usa `recursive: true`
- a profundidade de HTML está limitada por `maxRecursiveDepth: 3`
- os logs são emitidos em memória via `EventEmitter`
- o storage atual é local, sem banco de dados
- quando o browser detecta Cloudflare, captcha ou challenge, o backend salva screenshot, HTML e metadados em `backend/storage/jobs/<jobId>/evidence`
- perfis protegidos podem reutilizar sessão persistente em `backend/storage/browser-sessions`

## Variáveis úteis

- `PROTECTED_BROWSER_HEADLESS=true|false`
  Quando `false`, o perfil protegido abre o navegador com interface para tentar passar por desafios mais agressivos.
- `PERSIST_BROWSER_SESSION=true|false`
  Mantém cookies e storage local entre tentativas do perfil protegido.
- `SHOPIFY_STATIC_TIMEOUT_MS`
  Timeout total do fallback estático para Shopify.
- `SHOPIFY_STATIC_REQUEST_TIMEOUT_MS`
  Timeout por request no fallback estático para Shopify.

## Melhorias futuras

- autenticação
- rate limit
- timeout por job
- limpeza automática de jobs antigos
- suporte a proxy
- whitelist/blacklist de domínios
- painel de histórico de jobs

## Observação importante

O resultado do scraping pode variar conforme o site:

- páginas com login
- bloqueios anti-bot
- service workers
- conteúdo altamente dinâmico
- APIs privadas

podem exigir ajustes adicionais.
