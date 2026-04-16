function toSentenceCase(text) {
  const lower = text.toLowerCase();
  return lower.replace(
    /(^\s*[a-zçáàâãéèêíïóôõöúçñ]|[\.\!\?]\s+[a-zçáàâãéèêíïóôõöúçñ])/gimu,
    (c) => c.toUpperCase(),
  );
}

function toLowerCaseCustom(text) {
  return text.toLowerCase();
}

function toUpperCaseCustom(text) {
  return text.toUpperCase();
}

function toCapitalizedCase(text) {
  return text
    .toLowerCase()
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}

function toTitleCase(text) {
  const smallWords = new Set([
    "a",
    "as",
    "o",
    "os",
    "de",
    "da",
    "das",
    "do",
    "dos",
    "e",
    "em",
    "no",
    "nos",
    "na",
    "nas",
    "para",
    "por",
    "com",
  ]);

  const words = text.toLowerCase().split(/(\s+)/);

  return words
    .map((w, idx) => {
      if (/^\s+$/.test(w)) return w;
      const plain = w.normalize("NFD").replace(/\p{Diacritic}/gu, "");
      if (idx !== 0 && smallWords.has(plain)) {
        return w;
      }
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join("");
}

function toAlternatingCase(text) {
  let toggle = false;
  let result = "";

  for (const ch of text.toLowerCase()) {
    if (/[a-záàâãéèêíïóôõöúçñ]/i.test(ch)) {
      result += toggle ? ch.toUpperCase() : ch.toLowerCase();
      toggle = !toggle;
    } else {
      result += ch;
    }
  }

  return result;
}

function toSlugCase(text) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function convert(mode) {
  const input = document.getElementById("input-text");
  const output = document.getElementById("output-text");
  if (!input || !output) return;

  const value = input.value || "";

  let result = value;
  switch (mode) {
    case "sentence":
      result = toSentenceCase(value);
      break;
    case "lower":
      result = toLowerCaseCustom(value);
      break;
    case "upper":
      result = toUpperCaseCustom(value);
      break;
    case "capitalized":
      result = toCapitalizedCase(value);
      break;
    case "title":
      result = toTitleCase(value);
      break;
    case "alternating":
      result = toAlternatingCase(value);
      break;
    case "slug":
      result = toSlugCase(value);
      break;
    default:
      result = value;
  }

  output.value = result;
}

function setupConvertCase() {
  const buttons = document.querySelectorAll(
    ".convertcase-actions button[data-mode]",
  );
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-mode");
      convert(mode);
    });
  });

  const input = document.getElementById("input-text");
  if (input) {
    input.addEventListener("keyup", (event) => {
      if (event.ctrlKey && event.key.toLowerCase() === "u") {
        convert("upper");
      }
    });
  }

  const copyBtn = document.getElementById("copy-output");
  const output = document.getElementById("output-text");
  const status = document.querySelector(".copy-status");

  if (copyBtn && output) {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(output.value || "");
        if (status) {
          status.textContent = "Copiado!";
          setTimeout(() => {
            status.textContent = "";
          }, 1600);
        }
      } catch (error) {
        if (status) {
          status.textContent = "Não foi possível copiar.";
          status.style.color = "#dc3545";
        }
      }
    });
  }
}

setupConvertCase();
