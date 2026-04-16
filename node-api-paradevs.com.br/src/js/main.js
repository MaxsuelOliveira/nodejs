const PIX_COPIA_E_COLA = "INSIRA_SEU_CODIGO_PIX_AQUI";

let ferramentas = [];

function Alink(url, icone, categoria, nome, descricao) {
  return `<a href="${url}">
    ${icone}
    <div>
    <span class="categoria">${categoria}</span>
    <span>${nome}</span>
    </div>
    </a>`;
}

function renderFerramentas(filtroTexto = "") {
  const container = document.querySelector("#root .tools");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  const texto = filtroTexto.trim().toLowerCase();

  const filtradas = ferramentas
    .filter((f) => f.active)
    .filter((f) => {
      if (!texto) return true;
      const nome = (f.nome || "").toLowerCase();
      const descricao = (f.descricao || "").toLowerCase();
      const categoria = (f.categoria || "").toLowerCase();
      return (
        nome.includes(texto) ||
        descricao.includes(texto) ||
        categoria.includes(texto)
      );
    });

  if (!filtradas.length) {
    container.insertAdjacentHTML(
      "beforeend",
      '<p class="tools-empty">Nenhuma ferramenta encontrada para a sua busca.</p>',
    );
    return;
  }

  filtradas.forEach((element) => {
    const { url, icone, categoria, nome, descricao } = element;
    container.insertAdjacentHTML(
      "beforeend",
      Alink(url, icone, categoria, nome, descricao),
    );
  });
}

function configurarBusca() {
  const input = document.querySelector(".buscar input");
  const form = document.querySelector(".buscar form");

  if (!input || !form) {
    return;
  }

  input.addEventListener("input", function () {
    renderFerramentas(this.value);
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    renderFerramentas(input.value);
  });
}

function renderPixDonate() {
  if (!PIX_COPIA_E_COLA || PIX_COPIA_E_COLA === "INSIRA_SEU_CODIGO_PIX_AQUI") {
    return;
  }

  const sections = document.querySelectorAll("main > section");
  if (!sections || sections.length < 4) {
    return;
  }

  const donateSection = sections[3];
  const container = donateSection.querySelector(".container");

  if (!container) {
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "pix-donate";

  const title = document.createElement("p");
  title.className = "pix-label";
  title.textContent = "Escaneie o QRCode ou copie o código PIX:";

  const img = document.createElement("img");
  img.className = "pix-qrcode";
  img.alt = "QR Code PIX paradevs.com.br";
  img.src =
    "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" +
    encodeURIComponent(PIX_COPIA_E_COLA);

  const codeEl = document.createElement("code");
  codeEl.className = "pix-code";
  codeEl.textContent = PIX_COPIA_E_COLA;

  wrapper.appendChild(title);
  wrapper.appendChild(img);
  wrapper.appendChild(codeEl);

  container.appendChild(wrapper);
}

function criarPixDialog() {
  if (!PIX_COPIA_E_COLA || PIX_COPIA_E_COLA === "INSIRA_SEU_CODIGO_PIX_AQUI") {
    return;
  }

  const existente = document.querySelector(".pix-dialog-backdrop");
  if (existente) {
    return;
  }

  const backdrop = document.createElement("div");
  backdrop.className = "pix-dialog-backdrop";

  const dialog = document.createElement("div");
  dialog.className = "pix-dialog";

  const titulo = document.createElement("h3");
  titulo.textContent = "PIX - Ajude o projeto";

  const texto = document.createElement("p");
  texto.textContent = "Use o código abaixo para enviar o seu PIX-copia e cola:";

  const codigo = document.createElement("code");
  codigo.className = "pix-dialog-code";
  codigo.textContent = PIX_COPIA_E_COLA;

  const fechar = document.createElement("button");
  fechar.type = "button";
  fechar.className = "pix-dialog-close";
  fechar.textContent = "Fechar";

  fechar.addEventListener("click", () => {
    document.body.removeChild(backdrop);
  });

  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) {
      document.body.removeChild(backdrop);
    }
  });

  dialog.appendChild(titulo);
  dialog.appendChild(texto);
  dialog.appendChild(codigo);
  dialog.appendChild(fechar);

  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
}

function configurarPixDialogTriggers() {
  const sections = document.querySelectorAll("main > section");
  if (!sections || sections.length < 4) {
    return;
  }

  const donateSection = sections[3];
  const link = donateSection.querySelector('a[href="#donate"]');

  if (!link) {
    return;
  }

  link.addEventListener("click", (event) => {
    event.preventDefault();
    criarPixDialog();
  });
}

async function main() {
  try {
    const response = await fetch("data/ferramentas.json");

    if (!response.ok) {
      console.log(response);
      return;
    }

    ferramentas = await response.json();

    renderFerramentas();
    configurarBusca();
    renderPixDonate();
    configurarPixDialogTriggers();
  } catch (error) {
    console.error("Erro ao carregar ferramentas:", error);
  }
}

main();
