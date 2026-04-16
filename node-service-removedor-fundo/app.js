const elements = {
  fileInput: document.getElementById('fileInput'),
  dropZone: document.getElementById('dropZone'),
  processBtn: document.getElementById('processBtn'),
  downloadBtn: document.getElementById('downloadBtn'),
  compareRange: document.getElementById('compareRange'),
  beforeClip: document.getElementById('beforeClip'),
  comparisonHandle: document.getElementById('comparisonHandle'),
  comparisonWrapper: document.getElementById('comparisonWrapper'),
  originalCanvas: document.getElementById('originalCanvas'),
  resultCanvas: document.getElementById('resultCanvas'),
  statusPill: document.getElementById('statusPill'),
  fileName: document.getElementById('fileName'),
  resolution: document.getElementById('resolution'),
  detectedBg: document.getElementById('detectedBg'),
  targetHueText: document.getElementById('targetHueText'),
  strengthRange: document.getElementById('strengthRange'),
  softnessRange: document.getElementById('softnessRange'),
  despillRange: document.getElementById('despillRange'),
  noiseRange: document.getElementById('noiseRange'),
  autoProcess: document.getElementById('autoProcess'),
  strengthValue: document.getElementById('strengthValue'),
  softnessValue: document.getElementById('softnessValue'),
  despillValue: document.getElementById('despillValue'),
  noiseValue: document.getElementById('noiseValue'),
  modeButtons: [...document.querySelectorAll('[data-bg-mode]')],
};

const originalCtx = elements.originalCanvas.getContext('2d', { willReadFrequently: true });
const resultCtx = elements.resultCanvas.getContext('2d', { willReadFrequently: true });

const state = {
  image: null,
  file: null,
  bgMode: 'auto',
  params: {
    strength: 0.64,
    softness: 0.22,
    despill: 0.58,
    noiseCleanup: 1,
  },
  detected: null,
};

const BG_PRESETS = {
  green: { label: 'Verde', hue: 120, hueRange: 58 },
  blue: { label: 'Azul', hue: 220, hueRange: 52 },
};

function init() {
  bindEvents();
  syncParamLabels();
  updateComparisonSlider(50);
}

function bindEvents() {
  elements.fileInput.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (file) loadFile(file);
  });

  ['dragenter', 'dragover'].forEach(evt => {
    elements.dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      elements.dropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'dragend', 'drop'].forEach(evt => {
    elements.dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      elements.dropZone.classList.remove('dragover');
    });
  });

  elements.dropZone.addEventListener('drop', (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) loadFile(file);
  });

  elements.compareRange.addEventListener('input', (e) => {
    updateComparisonSlider(Number(e.target.value));
  });

  [
    ['strengthRange', 'strength'],
    ['softnessRange', 'softness'],
    ['despillRange', 'despill'],
    ['noiseRange', 'noiseCleanup'],
  ].forEach(([id, key]) => {
    elements[id].addEventListener('input', (e) => {
      state.params[key] = Number(e.target.value);
      syncParamLabels();
      if (state.image && elements.autoProcess.checked) processImage();
    });
  });

  elements.modeButtons.forEach(button => {
    button.addEventListener('click', () => {
      state.bgMode = button.dataset.bgMode;
      elements.modeButtons.forEach(btn => btn.classList.toggle('active', btn === button));
      if (state.image && elements.autoProcess.checked) processImage();
    });
  });

  elements.processBtn.addEventListener('click', processImage);
  elements.downloadBtn.addEventListener('click', downloadResult);
  window.addEventListener('resize', redrawCanvases);
}

function syncParamLabels() {
  elements.strengthValue.textContent = state.params.strength.toFixed(2);
  elements.softnessValue.textContent = state.params.softness.toFixed(2);
  elements.despillValue.textContent = state.params.despill.toFixed(2);
  elements.noiseValue.textContent = String(state.params.noiseCleanup);
}

function setStatus(text) {
  elements.statusPill.textContent = text;
}

function loadFile(file) {
  const image = new Image();
  const url = URL.createObjectURL(file);

  image.onload = () => {
    state.image = image;
    state.file = file;
    elements.fileName.textContent = file.name;
    elements.resolution.textContent = `${image.naturalWidth} × ${image.naturalHeight}`;
    elements.processBtn.disabled = false;
    elements.downloadBtn.disabled = true;
    elements.comparisonWrapper.classList.remove('empty');
    redrawCanvases();
    if (elements.autoProcess.checked) processImage();
    else setStatus('Imagem carregada');
    URL.revokeObjectURL(url);
  };

  image.onerror = () => {
    setStatus('Falha ao carregar');
    URL.revokeObjectURL(url);
  };

  image.src = url;
}

function redrawCanvases() {
  if (!state.image) return;

  const wrapper = elements.comparisonWrapper;
  const bounds = wrapper.getBoundingClientRect();
  const imageRatio = state.image.naturalWidth / state.image.naturalHeight;
  const wrapperRatio = bounds.width / bounds.height;

  let drawWidth = bounds.width;
  let drawHeight = bounds.height;

  if (wrapperRatio > imageRatio) {
    drawWidth = bounds.height * imageRatio;
  } else {
    drawHeight = bounds.width / imageRatio;
  }

  [elements.originalCanvas, elements.resultCanvas].forEach(canvas => {
    canvas.width = Math.round(drawWidth);
    canvas.height = Math.round(drawHeight);
    canvas.style.width = `${drawWidth}px`;
    canvas.style.height = `${drawHeight}px`;
    canvas.style.left = `${(bounds.width - drawWidth) / 2}px`;
    canvas.style.top = `${(bounds.height - drawHeight) / 2}px`;
  });

  originalCtx.clearRect(0, 0, elements.originalCanvas.width, elements.originalCanvas.height);
  resultCtx.clearRect(0, 0, elements.resultCanvas.width, elements.resultCanvas.height);
  originalCtx.drawImage(state.image, 0, 0, elements.originalCanvas.width, elements.originalCanvas.height);
  resultCtx.drawImage(state.image, 0, 0, elements.resultCanvas.width, elements.resultCanvas.height);

  if (elements.downloadBtn.disabled === false) {
    processImage();
  }
}

function processImage() {
  if (!state.image) return;

  setStatus('Processando');
  resultCtx.clearRect(0, 0, elements.resultCanvas.width, elements.resultCanvas.height);
  resultCtx.drawImage(state.image, 0, 0, elements.resultCanvas.width, elements.resultCanvas.height);

  const imageData = resultCtx.getImageData(0, 0, elements.resultCanvas.width, elements.resultCanvas.height);
  const data = imageData.data;
  const preset = detectBackgroundPreset(data, state.bgMode);
  state.detected = preset;

  elements.detectedBg.textContent = preset.label;
  elements.targetHueText.textContent = `H ${Math.round(preset.hue)}° ± ${Math.round(preset.hueRange)}°`;

  const alphaMap = new Float32Array(elements.resultCanvas.width * elements.resultCanvas.height);
  const { strength, softness, despill, noiseCleanup } = state.params;

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    const a = data[i + 3];

    if (a === 0) {
      alphaMap[p] = 0;
      continue;
    }

    const hsv = rgbToHsv(r, g, b);
    const hueDistance = circularHueDistance(hsv.h, preset.hue) / preset.hueRange;
    const hueScore = 1 - clamp(hueDistance, 0, 1);
    const satScore = smoothstep(0.08, 0.95, hsv.s);
    const valScore = smoothstep(0.08, 1.0, hsv.v);

    const chromaDominance = computeChromaDominance(r, g, b, preset.key);
    const colorScore = clamp((hueScore * 0.55) + (satScore * 0.15) + (valScore * 0.05) + (chromaDominance * 0.25), 0, 1);

    let backgroundLikelihood = smoothstep(1 - strength, 1 - softness * 0.35, colorScore);

    if (hsv.s < 0.06 || hsv.v < 0.08) {
      backgroundLikelihood *= 0.35;
    }

    const alpha = Math.round(255 * (1 - backgroundLikelihood));
    alphaMap[p] = alpha;

    if (preset.key === 'green' && g > r && g > b) {
      const excess = g - Math.max(r, b);
      data[i + 1] = clamp(Math.round(g - excess * despill), 0, 255);
    }

    if (preset.key === 'blue' && b > r && b > g) {
      const excess = b - Math.max(r, g);
      data[i + 2] = clamp(Math.round(b - excess * despill), 0, 255);
    }
  }

  let filteredAlpha = alphaMap;
  for (let pass = 0; pass < noiseCleanup; pass++) {
    filteredAlpha = boxBlurAlpha(filteredAlpha, elements.resultCanvas.width, elements.resultCanvas.height);
    filteredAlpha = medianLikeCleanup(filteredAlpha, elements.resultCanvas.width, elements.resultCanvas.height);
  }

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    data[i + 3] = clamp(Math.round(filteredAlpha[p]), 0, 255);
  }

  resultCtx.putImageData(imageData, 0, 0);
  elements.downloadBtn.disabled = false;
  setStatus('Pronto');
}

function detectBackgroundPreset(data, mode) {
  if (mode === 'green') return { ...BG_PRESETS.green, key: 'green' };
  if (mode === 'blue') return { ...BG_PRESETS.blue, key: 'blue' };

  const stats = sampleEdgeStats(data, elements.resultCanvas.width, elements.resultCanvas.height);
  const avgHue = weightedCircularMean(stats.samples.map(s => ({ angle: s.h, weight: s.s * s.v + 0.001 })));

  const greenDistance = circularHueDistance(avgHue, BG_PRESETS.green.hue);
  const blueDistance = circularHueDistance(avgHue, BG_PRESETS.blue.hue);

  if (greenDistance <= blueDistance) {
    return { ...BG_PRESETS.green, key: 'green', hue: avgHue };
  }

  return { ...BG_PRESETS.blue, key: 'blue', hue: avgHue };
}

function sampleEdgeStats(data, width, height) {
  const band = Math.max(6, Math.floor(Math.min(width, height) * 0.04));
  const samples = [];

  function pushPixel(x, y) {
    const i = (y * width + x) * 4;
    const hsv = rgbToHsv(data[i], data[i + 1], data[i + 2]);
    if (hsv.s > 0.06 && hsv.v > 0.06) samples.push(hsv);
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < band; x++) pushPixel(x, y);
    for (let x = width - band; x < width; x++) pushPixel(x, y);
  }

  for (let x = band; x < width - band; x++) {
    for (let y = 0; y < band; y++) pushPixel(x, y);
    for (let y = height - band; y < height; y++) pushPixel(x, y);
  }

  return { samples: samples.length ? samples : [{ h: 120, s: 1, v: 1 }] };
}

function computeChromaDominance(r, g, b, key) {
  if (key === 'green') return clamp((g - Math.max(r, b)) / 255, 0, 1);
  return clamp((b - Math.max(r, g)) / 255, 0, 1);
}

function boxBlurAlpha(alpha, width, height) {
  const out = new Float32Array(alpha.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      for (let ky = -1; ky <= 1; ky++) {
        const ny = y + ky;
        if (ny < 0 || ny >= height) continue;
        for (let kx = -1; kx <= 1; kx++) {
          const nx = x + kx;
          if (nx < 0 || nx >= width) continue;
          sum += alpha[ny * width + nx];
          count++;
        }
      }
      out[y * width + x] = sum / count;
    }
  }
  return out;
}

function medianLikeCleanup(alpha, width, height) {
  const out = new Float32Array(alpha.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const neighbors = [];
      for (let ky = -1; ky <= 1; ky++) {
        const ny = y + ky;
        if (ny < 0 || ny >= height) continue;
        for (let kx = -1; kx <= 1; kx++) {
          const nx = x + kx;
          if (nx < 0 || nx >= width) continue;
          neighbors.push(alpha[ny * width + nx]);
        }
      }
      neighbors.sort((a, b) => a - b);
      out[y * width + x] = neighbors[Math.floor(neighbors.length / 2)];
    }
  }
  return out;
}

function updateComparisonSlider(value) {
  elements.beforeClip.style.width = `${value}%`;
  elements.comparisonHandle.style.left = `${value}%`;
}

function downloadResult() {
  if (!state.image) return;

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = state.image.naturalWidth;
  exportCanvas.height = state.image.naturalHeight;
  const exportCtx = exportCanvas.getContext('2d', { willReadFrequently: true });
  exportCtx.drawImage(state.image, 0, 0);

  const imageData = exportCtx.getImageData(0, 0, exportCanvas.width, exportCanvas.height);
  const data = imageData.data;
  const preset = detectBackgroundPreset(data, state.bgMode === 'auto' ? 'auto' : state.bgMode);
  const alphaMap = new Float32Array(exportCanvas.width * exportCanvas.height);
  const { strength, softness, despill, noiseCleanup } = state.params;

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    const hsv = rgbToHsv(r, g, b);
    const hueDistance = circularHueDistance(hsv.h, preset.hue) / preset.hueRange;
    const hueScore = 1 - clamp(hueDistance, 0, 1);
    const satScore = smoothstep(0.08, 0.95, hsv.s);
    const valScore = smoothstep(0.08, 1.0, hsv.v);
    const chromaDominance = computeChromaDominance(r, g, b, preset.key);
    const colorScore = clamp((hueScore * 0.55) + (satScore * 0.15) + (valScore * 0.05) + (chromaDominance * 0.25), 0, 1);
    let backgroundLikelihood = smoothstep(1 - strength, 1 - softness * 0.35, colorScore);
    if (hsv.s < 0.06 || hsv.v < 0.08) backgroundLikelihood *= 0.35;
    alphaMap[p] = Math.round(255 * (1 - backgroundLikelihood));

    if (preset.key === 'green' && g > r && g > b) {
      const excess = g - Math.max(r, b);
      data[i + 1] = clamp(Math.round(g - excess * despill), 0, 255);
    }
    if (preset.key === 'blue' && b > r && b > g) {
      const excess = b - Math.max(r, g);
      data[i + 2] = clamp(Math.round(b - excess * despill), 0, 255);
    }
  }

  let filteredAlpha = alphaMap;
  for (let pass = 0; pass < noiseCleanup; pass++) {
    filteredAlpha = boxBlurAlpha(filteredAlpha, exportCanvas.width, exportCanvas.height);
    filteredAlpha = medianLikeCleanup(filteredAlpha, exportCanvas.width, exportCanvas.height);
  }

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    data[i + 3] = clamp(Math.round(filteredAlpha[p]), 0, 255);
  }

  exportCtx.putImageData(imageData, 0, 0);
  const link = document.createElement('a');
  const baseName = state.file?.name?.replace(/\.[^.]+$/, '') || 'imagem';
  link.download = `${baseName}-sem-fundo.png`;
  link.href = exportCanvas.toDataURL('image/png');
  link.click();
}

function rgbToHsv(r, g, b) {
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;
  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === nr) h = 60 * (((ng - nb) / delta) % 6);
    else if (max === ng) h = 60 * ((nb - nr) / delta + 2);
    else h = 60 * ((nr - ng) / delta + 4);
  }

  if (h < 0) h += 360;
  const s = max === 0 ? 0 : delta / max;
  const v = max;
  return { h, s, v };
}

function weightedCircularMean(items) {
  let sumX = 0;
  let sumY = 0;
  for (const item of items) {
    const angle = item.angle * Math.PI / 180;
    sumX += Math.cos(angle) * item.weight;
    sumY += Math.sin(angle) * item.weight;
  }
  let angle = Math.atan2(sumY, sumX) * 180 / Math.PI;
  if (angle < 0) angle += 360;
  return angle;
}

function circularHueDistance(a, b) {
  const diff = Math.abs(a - b);
  return Math.min(diff, 360 - diff);
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

init();
