/* ===== MAIN APP ===== */
(async () => {
  /* Init PDF.js worker */
  if (window.pdfjsLib)
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  /* ── Restore from localStorage ── */
  state.loadFromLocal();
  if (state.template) {
    document.getElementById('tpl-name').textContent = state.template;
  }

  /* ── Restore UI preferences ── */
  const prefs = state.loadPrefs();
  if (prefs.activePanel) {
    const icon = document.querySelector(`.sb-icon[data-panel="${prefs.activePanel}"]`);
    if (icon) switchPanel(prefs.activePanel, icon);
  }

  try {
    await Promise.all([loadTemplates(), loadFonts(), loadImages(), checkAPI()]);
  } catch (e) {
    console.warn('Init:', e);
  }
  setupDragDrop();
  initRulerBtn();

  /* If we had a template from localStorage, restore canvas */
  if (state.template) {
    canvas.renderAll();
    canvas.initCursorTracker();
    generatePreview();
    renderLayers();
  }

  /* Restore students list */
  renderStudents();
  updateStudentNav();
  renderVariableTags();

  /* periodic status check */
  setInterval(checkAPI, 15000);

  /* Auto-save indicator */
  console.log('[CertificaFacil] Estado restaurado do navegador ✓');
})();

/* ═══════════════════════════════════════════
   API STATUS
   ═══════════════════════════════════════════ */
async function checkAPI() {
  const ok = await API.ping();
  const el = document.getElementById('api-status');
  if (!el) return;
  el.className = 'status ' + (ok ? 'online' : 'offline');
  el.innerHTML = `<span class="dot"></span>${ok ? 'Online' : 'Offline'}`;
}

/* ═══════════════════════════════════════════
   PANEL SWITCHING
   ═══════════════════════════════════════════ */
function switchPanel(name, iconEl) {
  document.querySelectorAll('.sb-icon[data-panel]').forEach((i) => i.classList.remove('active'));
  if (iconEl) iconEl.classList.add('active');

  const map = {
    templates: 'pane-templates',
    layers: 'pane-layers',
    text: 'pane-text',
    images: 'pane-images',
    students: 'pane-students',
  };
  document.querySelectorAll('.pane').forEach((p) => p.classList.remove('active'));
  const target = document.getElementById(map[name]);
  if (target) target.classList.add('active');

  /* refresh layers when switching to layers panel */
  if (name === 'layers') renderLayers();

  /* save active panel preference */
  state.savePrefs({ activePanel: name });
}

/* ═══════════════════════════════════════════
   TEMPLATES
   ═══════════════════════════════════════════ */
async function loadTemplates() {
  const list = await API.listTemplates();
  const $list = document.getElementById('tpl-list');
  if (!$list) return;
  $list.innerHTML = '';
  list.forEach((name) => {
    const item = document.createElement('div');
    item.className = 'item' + (state.template === name ? ' on' : '');
    item.innerHTML = `<i data-lucide="file-text"></i><span class="name">${name}</span>`;
    item.onclick = () => selectTemplate(name);
    $list.appendChild(item);
  });
  lucide.createIcons();
}

async function selectTemplate(name) {
  state.template = name;
  state.reset();
  document.getElementById('tpl-name').textContent = name;

  /* load saved config: try server first, then localStorage */
  try {
    const r = await API.loadConfig(name);
    if (r.found && r.config) state.loadConfig(r.config);
  } catch (e) {
    console.warn('Config server load failed, using localStorage:', e);
  }

  state.saveToLocal();

  await generatePreview();
  canvas.renderAll();
  canvas.initCursorTracker();
  renderLayers();

  /* highlight selected template */
  document
    .querySelectorAll('#tpl-list .item')
    .forEach((i) => i.classList.toggle('on', i.querySelector('.name').textContent === name));
}

async function uploadTemplate(input) {
  if (!input.files[0]) return;
  showLoader('Enviando template...');
  try {
    await API.uploadTemplate(input.files[0]);
    await loadTemplates();
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Template enviado!',
      showConfirmButton: false,
      timer: 2000,
      background: '#1c1c1c',
      color: '#e5e5e5',
    });
  } catch (e) {
    Swal.fire({
      icon: 'error',
      title: 'Erro',
      text: e.message,
      background: '#1c1c1c',
      color: '#e5e5e5',
    });
  }
  hideLoader();
  input.value = '';
}

/* drag & drop */
function setupDragDrop() {
  const dz = document.getElementById('drop-zone');
  if (!dz) return;
  ['dragenter', 'dragover'].forEach((ev) =>
    dz.addEventListener(ev, (e) => {
      e.preventDefault();
      dz.classList.add('over');
    }),
  );
  ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, () => dz.classList.remove('over')));
  dz.addEventListener('drop', async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.toLowerCase().endsWith('.pdf')) {
      const fakeInput = { files: [file], value: '' };
      await uploadTemplate(fakeInput);
    }
  });
}

/* ═══════════════════════════════════════════
   PREVIEW (PDF.js)
   ═══════════════════════════════════════════ */
let _previewTimeout = null;
function generatePreview() {
  if (_previewTimeout) clearTimeout(_previewTimeout);
  _previewTimeout = setTimeout(_doPreview, 300);
}

async function _doPreview() {
  if (!state.template) return;
  const stu = state.currentStudent();
  try {
    const r = await API.generate(state.template, state.getUIConfig(), stu);
    state.setPageDims(r.width, r.height);
    document.getElementById('page-info').textContent = `${r.width} × ${r.height} pt`;

    /* render PDF page to image using PDF.js */
    const pdfData = atob(r.pdf);
    const bytes = new Uint8Array(pdfData.length);
    for (let i = 0; i < pdfData.length; i++) bytes[i] = pdfData.charCodeAt(i);

    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const page = await pdf.getPage(1);
    const scale = 2; // render at 2x for sharpness
    const vp = page.getViewport({ scale });
    const offCanvas = document.createElement('canvas');
    offCanvas.width = vp.width;
    offCanvas.height = vp.height;
    const ctx = offCanvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport: vp }).promise;

    const imgUrl = offCanvas.toDataURL('image/png');
    const $img = document.getElementById('cert-img');
    $img.src = imgUrl;
    $img.style.width = r.width + 'px';
    $img.style.height = r.height + 'px';

    document.getElementById('canvas-wrap').classList.remove('hidden');
    document.getElementById('empty-state').classList.add('hidden');

    canvas.drawRulers();
  } catch (e) {
    console.error('Preview error:', e);
  }
}

/* ═══════════════════════════════════════════
   TEXT FIELDS
   ═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   LAYERS PANEL
   ═══════════════════════════════════════════ */
function renderLayers() {
  const $list = document.getElementById('layer-list');
  if (!$list) return;
  $list.innerHTML = '';

  const layers = state.getAllLayers();
  const selId = state.getSelected()?.id;

  /* render in reverse so top element appears first */
  [...layers].reverse().forEach((layer) => {
    const el = document.createElement('div');
    el.className = 'layer-item' + (layer.id === selId ? ' selected' : '');
    if (!layer.visible) el.classList.add('hidden-layer');
    if (layer.locked) el.classList.add('locked-layer');
    el.dataset.id = layer.id;

    const icon = layer.type === 'text' ? 'type' : 'image';
    const label =
      layer.type === 'text'
        ? (layer.content || 'Texto').substring(0, 30)
        : (layer.path || 'Imagem').split('/').pop();

    el.innerHTML = `
      <div class="layer-info" onclick="layerSelect('${layer.id}')">
        <i data-lucide="${icon}"></i>
        <span class="layer-name">${label}</span>
      </div>
      <div class="layer-btns">
        <button class="lb" onclick="event.stopPropagation();state.toggleVisibility('${layer.id}');renderLayers();canvas.renderAll()" title="${layer.visible ? 'Ocultar' : 'Mostrar'}">
          <i data-lucide="${layer.visible ? 'eye' : 'eye-off'}"></i>
        </button>
        <button class="lb" onclick="event.stopPropagation();state.toggleLock('${layer.id}');renderLayers()" title="${layer.locked ? 'Desbloquear' : 'Bloquear'}">
          <i data-lucide="${layer.locked ? 'lock' : 'unlock'}"></i>
        </button>
      </div>
    `;
    $list.appendChild(el);
  });

  document.getElementById('layer-count').textContent = layers.length;
  lucide.createIcons();

  /* sortable drag reorder */
  if (window.Sortable && !$list._sortableInit) {
    Sortable.create($list, {
      animation: 150,
      ghostClass: 'layer-ghost',
      onEnd: () => {
        /* TODO: reorder state arrays based on new DOM order */
        state.saveToLocal();
      },
    });
    $list._sortableInit = true;
  }
}

function layerSelect(id) {
  canvas.selectElement(id);
  const sel = state.getSelected();
  if (sel && state.fields.includes(sel)) {
    switchPanel('text', document.querySelector('.sb-icon[data-panel="text"]'));
  }
  renderLayers();
}

function layerMoveUp() {
  const sel = state.getSelected();
  if (!sel) return;
  state.pushUndo();
  state.moveLayerUp(sel.id);
  canvas.renderAll();
  renderLayers();
  generatePreview();
}

function layerMoveDown() {
  const sel = state.getSelected();
  if (!sel) return;
  state.pushUndo();
  state.moveLayerDown(sel.id);
  canvas.renderAll();
  renderLayers();
  generatePreview();
}

function layerDuplicate() {
  const sel = state.getSelected();
  if (!sel) return;
  if (state.fields.includes(sel)) {
    const dup = state.duplicateField(sel.id);
    if (dup) {
      canvas.renderAll();
      canvas.selectElement(dup.id);
      renderLayers();
      generatePreview();
    }
  }
}

function layerDelete() {
  const sel = state.getSelected();
  if (!sel) return;
  if (state.fields.includes(sel)) {
    state.removeField(sel.id);
  } else {
    state.removeImage(sel.id);
  }
  canvas.renderAll();
  renderLayers();
  generatePreview();
}

function addTextField() {
  const f = state.addField();
  canvas.renderAll();
  canvas.selectElement(f.id);
  switchPanel('text', document.querySelector('.sb-icon[data-panel="text"]'));
  renderLayers();
  generatePreview();
}

function updateEl(prop, val) {
  const sel = state.getSelected();
  if (!sel) return;

  const isField = state.fields.includes(sel);

  switch (prop) {
    case 'content':
      state.pushUndo();
      sel.content = val;
      break;
    case 'font':
      state.pushUndo();
      sel.font = val;
      break;
    case 'fontSize':
      state.pushUndo();
      sel.fontSize = parseFloat(val) || 18;
      break;
    case 'color':
      state.pushUndo();
      sel.color = val;
      document.getElementById('color-lbl').textContent = val;
      break;
    case 'lineHeight':
      state.pushUndo();
      sel.lineHeight = parseFloat(val) || 1.2;
      break;
    case 'letterSpacing':
      state.pushUndo();
      sel.letterSpacing = parseFloat(val) || 0;
      break;
    case 'autoResize':
      state.pushUndo();
      sel.autoResize = !!val;
      break;
    case 'posX':
      state.pushUndo();
      sel.x = parseFloat(val) || 0;
      break;
    case 'posY':
      state.pushUndo();
      sel.y = parseFloat(val) || 0;
      break;
    case 'posW':
      state.pushUndo();
      sel.w = parseFloat(val) || 100;
      break;
    case 'posH':
      state.pushUndo();
      sel.h = parseFloat(val) || 30;
      break;
    case 'opacity':
      state.pushUndo();
      sel.opacity = parseInt(val, 10);
      break;
    case 'rotation':
      state.pushUndo();
      sel.rotation = parseFloat(val) || 0;
      break;
  }
  canvas.renderAll();
  renderLayers();
  generatePreview();
}

function setAlign(al, btn) {
  const sel = state.getSelected();
  if (!sel) return;
  state.pushUndo();
  sel.align = al;
  document
    .querySelectorAll('.al-btn')
    .forEach((b) => b.classList.toggle('on', b.dataset.al === al));
  canvas.renderAll();
  generatePreview();
}

function insertTag(tag) {
  const el = document.getElementById('sel-content');
  if (!el) return;

  /* If it's a variable tag like {nome}, insert a badge span */
  const varMatch = tag.match(/^\{(\w+)\}$/);
  if (varMatch) {
    insertVariableBadge(varMatch[1]);
    return;
  }

  /* For formatting tags [B], [I], insert as text */
  el.focus();
  const sel = window.getSelection();
  if (!sel.rangeCount) {
    /* place cursor at end */
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }
  const textNode = document.createTextNode(tag);
  const range = sel.getRangeAt(0);
  range.deleteContents();
  range.insertNode(textNode);
  range.setStartAfter(textNode);
  range.setEndAfter(textNode);
  sel.removeAllRanges();
  sel.addRange(range);
  onBadgeEditorInput();
}

function insertVariableBadge(key) {
  const el = document.getElementById('sel-content');
  if (!el) return;
  el.focus();

  const badge = _createBadgeNode(key);
  const space = document.createTextNode('\u00A0');

  const sel = window.getSelection();
  if (!sel.rangeCount) {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }
  const range = sel.getRangeAt(0);
  range.deleteContents();
  range.insertNode(space);
  range.insertNode(badge);
  range.setStartAfter(space);
  range.setEndAfter(space);
  sel.removeAllRanges();
  sel.addRange(range);
  onBadgeEditorInput();
}

function _createBadgeNode(key) {
  const v = state.variables.find((v) => v.key === key);
  const label = v ? v.label : key;
  const span = document.createElement('span');
  span.className = 'var-badge';
  span.contentEditable = 'false';
  span.dataset.var = key;
  span.textContent = label;
  return span;
}

/* Extract plain text with {var} placeholders from the badge editor */
function _extractContentFromEditor() {
  const el = document.getElementById('sel-content');
  if (!el) return '';
  let result = '';
  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.classList && node.classList.contains('var-badge')) {
        result += '{' + (node.dataset.var || '') + '}';
      } else if (node.tagName === 'BR') {
        result += '\n';
      } else {
        /* recursively handle nested nodes */
        node.childNodes.forEach((child) => {
          if (child.nodeType === Node.TEXT_NODE) {
            result += child.textContent;
          } else if (child.classList && child.classList.contains('var-badge')) {
            result += '{' + (child.dataset.var || '') + '}';
          } else if (child.tagName === 'BR') {
            result += '\n';
          }
        });
      }
    }
  });
  return result;
}

/* Render plain text content into the badge editor with badge spans */
function _renderContentToBadgeEditor(content) {
  const el = document.getElementById('sel-content');
  if (!el) return;
  el.innerHTML = '';
  if (!content) return;

  /* Split by {variable} patterns, keeping the delimiters */
  const parts = content.split(/(\{[a-zA-Z0-9_]+\})/g);
  parts.forEach((part) => {
    const m = part.match(/^\{([a-zA-Z0-9_]+)\}$/);
    if (m) {
      el.appendChild(_createBadgeNode(m[1]));
    } else if (part) {
      /* handle newlines */
      const lines = part.split('\n');
      lines.forEach((line, i) => {
        if (i > 0) el.appendChild(document.createElement('br'));
        if (line) el.appendChild(document.createTextNode(line));
      });
    }
  });
}

/* Called on contenteditable input */
function onBadgeEditorInput() {
  const content = _extractContentFromEditor();
  updateEl('content', content);
}

/* Render variable tag buttons dynamically */
function renderVariableTags() {
  const container = document.getElementById('var-tags');
  if (!container) return;
  container.innerHTML = '';
  state.variables.forEach((v) => {
    const btn = document.createElement('button');
    btn.className = 'tag tag-var';
    btn.onclick = () => insertVariableBadge(v.key);
    btn.textContent = '{' + v.key + '}';
    if (!v.builtin) {
      const del = document.createElement('span');
      del.className = 'tag-del';
      del.textContent = '×';
      del.onclick = (e) => {
        e.stopPropagation();
        removeVariable(v.key);
      };
      btn.appendChild(del);
    }
    container.appendChild(btn);
  });
  lucide.createIcons();
}

async function addNewVariable() {
  const { value } = await Swal.fire({
    title: 'Nova Variável',
    html:
      '<input id="swal-vkey" class="swal2-input" placeholder="Chave (ex: email)">' +
      '<input id="swal-vlabel" class="swal2-input" placeholder="Nome (ex: E-mail)">',
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Criar',
    cancelButtonText: 'Cancelar',
    background: '#1c1c1c',
    color: '#e5e5e5',
    preConfirm: () => ({
      key: document.getElementById('swal-vkey').value.trim(),
      label: document.getElementById('swal-vlabel').value.trim(),
    }),
  });
  if (value && value.key) {
    const v = state.addVariable(value.key, value.label || value.key);
    if (v) {
      renderVariableTags();
      renderStudents();
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `Variável {${v.key}} criada!`,
        showConfirmButton: false,
        timer: 2000,
        background: '#1c1c1c',
        color: '#e5e5e5',
      });
    } else {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'warning',
        title: 'Variável já existe!',
        showConfirmButton: false,
        timer: 2000,
        background: '#1c1c1c',
        color: '#e5e5e5',
      });
    }
  }
}

function removeVariable(key) {
  state.removeVariable(key);
  renderVariableTags();
  renderStudents();
  /* re-render badge editor in case the removed badge is in content */
  const sel = state.getSelected();
  if (sel && state.fields.includes(sel)) {
    _renderContentToBadgeEditor(sel.content);
  }
}

/* Sync panel inputs when element selected */
function syncPanelToSelection() {
  const sel = state.getSelected();
  const isField = sel && state.fields.includes(sel);

  /* render badge editor content */
  if (isField) {
    _renderContentToBadgeEditor(sel.content || '');
  } else {
    const editor = document.getElementById('sel-content');
    if (editor) editor.innerHTML = '';
  }
  document.getElementById('sel-fsize').value = isField ? sel.fontSize : '';
  document.getElementById('sel-color').value = isField ? sel.color || '#000000' : '#000000';
  document.getElementById('color-lbl').textContent = isField ? sel.color || '#000000' : '#000000';
  document.getElementById('sel-lh').value = isField ? sel.lineHeight : '';
  document.getElementById('sel-ls').value = isField ? sel.letterSpacing : '';
  document.getElementById('sel-auto').checked = isField ? sel.autoResize : true;

  /* opacity & rotation */
  const opSlider = document.getElementById('sel-opacity');
  const opVal = document.getElementById('sel-opacity-val');
  const rotInput = document.getElementById('sel-rotation');
  if (opSlider) {
    opSlider.value = sel ? (sel.opacity ?? 100) : 100;
  }
  if (opVal) {
    opVal.textContent = (sel ? (sel.opacity ?? 100) : 100) + '%';
  }
  if (rotInput) {
    rotInput.value = sel ? (sel.rotation ?? 0) : 0;
  }

  if (sel) {
    document.getElementById('pos-x').value = sel.x || 0;
    document.getElementById('pos-y').value = sel.y || 0;
    document.getElementById('pos-w').value = sel.w || 0;
    document.getElementById('pos-h').value = sel.h || 0;
  }

  /* align buttons */
  const al = isField ? sel.align || 'center' : 'center';
  document
    .querySelectorAll('.al-btn')
    .forEach((b) => b.classList.toggle('on', b.dataset.al === al));

  /* font dropdown */
  if (isField) {
    const fontSel = document.getElementById('sel-font');
    if (fontSel) fontSel.value = sel.font || 'Arial';
  }
}

/* ═══════════════════════════════════════════
   FONTS
   ═══════════════════════════════════════════ */
let _fontsCache = [];
const SYSTEM_FONTS = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Courier New',
  'Verdana',
  'Impact',
  'Comic Sans MS',
  'Trebuchet MS',
];

async function loadFonts() {
  const server = await API.listFonts();
  _fontsCache = server;

  const sel = document.getElementById('sel-font');
  if (!sel) return;
  sel.innerHTML = '';

  /* system fonts */
  const sysGrp = document.createElement('optgroup');
  sysGrp.label = 'Sistema';
  SYSTEM_FONTS.forEach((f) => {
    const o = document.createElement('option');
    o.value = f;
    o.textContent = f;
    sysGrp.appendChild(o);
  });
  sel.appendChild(sysGrp);

  /* custom fonts */
  if (server.length) {
    const custGrp = document.createElement('optgroup');
    custGrp.label = 'Personalizadas';
    server.forEach((f) => {
      const o = document.createElement('option');
      o.value = f.name.replace(/\.(ttf|otf)$/i, '');
      o.textContent = f.name;
      custGrp.appendChild(o);
    });
    sel.appendChild(custGrp);
  }

  /* font list in panel */
  const fl = document.getElementById('font-list');
  if (fl) {
    fl.innerHTML = '';
    server.forEach((f) => {
      const item = document.createElement('div');
      item.className = 'item';
      item.innerHTML = `<i data-lucide="type"></i><span class="name">${f.name}</span>`;
      fl.appendChild(item);
    });
    lucide.createIcons();
  }
}

async function uploadFont() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.ttf,.otf';
  input.onchange = async () => {
    if (!input.files[0]) return;
    showLoader('Enviando fonte...');
    try {
      await API.uploadFont(input.files[0]);
      await loadFonts();
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Fonte adicionada!',
        showConfirmButton: false,
        timer: 2000,
        background: '#1c1c1c',
        color: '#e5e5e5',
      });
    } catch (e) {
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: e.message,
        background: '#1c1c1c',
        color: '#e5e5e5',
      });
    }
    hideLoader();
  };
  input.click();
}

/* ═══════════════════════════════════════════
   IMAGES
   ═══════════════════════════════════════════ */
async function loadImages() {
  const imgs = await API.listImages();
  const gal = document.getElementById('img-gallery');
  if (!gal) return;
  gal.innerHTML = '';
  imgs.forEach((img) => {
    const card = document.createElement('div');
    card.className = 'img-card';
    card.innerHTML = `<img src="/${img.path}" alt="${img.name}"><button class="del" onclick="event.stopPropagation();deleteImageFile('${img.name}')"><i data-lucide="x"></i></button>`;
    card.onclick = () => {
      const added = state.addImage(img.path);
      canvas.renderAll();
      canvas.selectElement(added.id);
      generatePreview();
    };
    gal.appendChild(card);
  });
  lucide.createIcons();
}

async function uploadImage() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async () => {
    if (!input.files[0]) return;
    showLoader('Enviando imagem...');
    try {
      await API.uploadImage(input.files[0]);
      await loadImages();
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Imagem adicionada!',
        showConfirmButton: false,
        timer: 2000,
        background: '#1c1c1c',
        color: '#e5e5e5',
      });
    } catch (e) {
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: e.message,
        background: '#1c1c1c',
        color: '#e5e5e5',
      });
    }
    hideLoader();
  };
  input.click();
}

async function deleteImageFile(name) {
  const result = await Swal.fire({
    title: 'Excluir imagem?',
    text: `Deseja excluir "${name}" permanentemente?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sim, excluir',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#ff5252',
    background: '#1c1c1c',
    color: '#e5e5e5',
  });
  if (!result.isConfirmed) return;
  try {
    await API.deleteImage(name);
    await loadImages();
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Imagem excluída!',
      showConfirmButton: false,
      timer: 2000,
      background: '#1c1c1c',
      color: '#e5e5e5',
    });
  } catch (e) {
    Swal.fire({
      icon: 'error',
      title: 'Erro',
      text: e.message,
      background: '#1c1c1c',
      color: '#e5e5e5',
    });
  }
}

/* ═══════════════════════════════════════════
   STUDENTS
   ═══════════════════════════════════════════ */
let selectedStudents = new Set();

function renderStudents(filter = '') {
  const $list = document.getElementById('stu-list');
  if (!$list) return;
  $list.innerHTML = '';
  const lc = filter.toLowerCase();

  const filtered = state.students
    .map((s, i) => ({ ...s, originalIdx: i }))
    .filter((s) => {
      if (!lc) return true;
      return Object.values(s).some((v) => String(v).toLowerCase().includes(lc));
    });

  /* Update toolbar visibility */
  const toolbar = document.getElementById('stu-toolbar');
  if (toolbar) toolbar.style.display = filtered.length > 0 ? 'flex' : 'none';

  filtered.forEach((s) => {
    const i = s.originalIdx;
    const item = document.createElement('div');
    item.className = 'item' + (i === state.studentIdx ? ' on' : '');
    
    /* Build display: show first two variable values */
    const vals = state.variables.map((v) => s[v.key] || '').filter(Boolean);
    const display =
      vals.length > 1 ? vals[0] + ' — ' + vals.slice(1).join(', ') : vals[0] || '(vazio)';
    
    const isChecked = selectedStudents.has(i);

    item.innerHTML = `
      <label class="chk sm" onclick="event.stopPropagation()">
        <input type="checkbox" class="stu-checkbox" data-idx="${i}" ${isChecked ? 'checked' : ''} onchange="toggleStudentSelection(${i}, this.checked)">
        <span></span>
      </label>
      <i data-lucide="user"></i>
      <span class="name">${display}</span>
      <div class="acts">
        <button class="tb-btn sm" onclick="event.stopPropagation();editStudent(${i})" title="Editar"><i data-lucide="pencil"></i></button>
        <button class="tb-btn sm" onclick="event.stopPropagation();removeStudent(${i})" title="Remover"><i data-lucide="trash-2"></i></button>
      </div>`;
    
    item.onclick = () => {
      state.studentIdx = i;
      renderStudents(filter);
      updateStudentNav();
      generatePreview();
    };
    $list.appendChild(item);
  });

  document.getElementById('stu-count').textContent = state.students.length;
  
  /* Update select all checkbox state */
  const selectAllChk = document.getElementById('stu-select-all');
  if (selectAllChk) {
    selectAllChk.checked = filtered.length > 0 && filtered.every(s => selectedStudents.has(s.originalIdx));
    selectAllChk.indeterminate = filtered.some(s => selectedStudents.has(s.originalIdx)) && !selectAllChk.checked;
  }

  lucide.createIcons();
}

function toggleStudentSelection(idx, checked) {
  if (checked) {
    selectedStudents.add(idx);
  } else {
    selectedStudents.delete(idx);
  }
  /* Re-render to update Select All state */
  const filter = document.getElementById('stu-search')?.value || '';
  renderStudents(filter);
}

function toggleSelectAllStudents(checked) {
  const filter = document.getElementById('stu-search')?.value || '';
  const lc = filter.toLowerCase();
  
  state.students.forEach((s, i) => {
    const matchesFilter = !lc || Object.values(s).some((v) => String(v).toLowerCase().includes(lc));
    if (matchesFilter) {
      if (checked) selectedStudents.add(i);
      else selectedStudents.delete(i);
    }
  });
  renderStudents(filter);
}

async function removeSelectedStudents() {
  if (selectedStudents.size === 0) return;

  const result = await Swal.fire({
    title: `Excluir ${selectedStudents.size} aluno(s)?`,
    text: 'Esta ação não pode ser desfeita.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sim, excluir',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#ff5252',
    background: '#1c1c1c',
    color: '#e5e5e5',
  });

  if (result.isConfirmed) {
    state.removeStudents(Array.from(selectedStudents));
    selectedStudents.clear();
    renderStudents();
    updateStudentNav();
    generatePreview();
    
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Alunos excluídos!',
      showConfirmButton: false,
      timer: 2000,
      background: '#1c1c1c',
      color: '#e5e5e5',
    });
  }
}

function updateStudentNav() {
  const nav = document.getElementById('stu-nav');
  if (nav) nav.textContent = `Aluno ${state.studentIdx + 1} de ${state.students.length}`;
}

function filterStudents(val) {
  renderStudents(val);
}

function prevStudent() {
  state.studentIdx = state.studentIdx - 1;
  renderStudents();
  updateStudentNav();
  generatePreview();
}
function nextStudent() {
  state.studentIdx = state.studentIdx + 1;
  renderStudents();
  updateStudentNav();
  generatePreview();
}

async function addStudent() {
  const inputs = state.variables
    .map((v) => `<input id="swal-var-${v.key}" class="swal2-input" placeholder="${v.label}">`)
    .join('');
  const { value } = await Swal.fire({
    title: 'Novo Aluno',
    html: inputs,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Adicionar',
    cancelButtonText: 'Cancelar',
    background: '#1c1c1c',
    color: '#e5e5e5',
    preConfirm: () => {
      const data = {};
      state.variables.forEach((v) => {
        data[v.key] = document.getElementById('swal-var-' + v.key).value;
      });
      return data;
    },
  });
  if (value && Object.values(value).some((v) => v)) {
    state.addStudent(value);
    renderStudents();
    updateStudentNav();
  }
}

async function editStudent(idx) {
  const s = state.students[idx];
  const inputs = state.variables
    .map((v) => {
      const val = (s[v.key] || '').replace(/"/g, '&quot;');
      return `<input id="swal-var-${v.key}" class="swal2-input" value="${val}" placeholder="${v.label}">`;
    })
    .join('');
  const { value } = await Swal.fire({
    title: 'Editar Aluno',
    html: inputs,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Salvar',
    cancelButtonText: 'Cancelar',
    background: '#1c1c1c',
    color: '#e5e5e5',
    preConfirm: () => {
      const data = {};
      state.variables.forEach((v) => {
        data[v.key] = document.getElementById('swal-var-' + v.key).value;
      });
      return data;
    },
  });
  if (value) {
    state.students[idx] = value;
    renderStudents();
    generatePreview();
  }
}

function removeStudent(idx) {
  state.removeStudent(idx);
  renderStudents();
  updateStudentNav();
  generatePreview();
}

function importCSV() {
  document.getElementById('modal-csv').classList.remove('hidden');
}

function loadCSVFile(input) {
  if (!input.files[0]) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('csv-input').value = e.target.result;
  };
  reader.readAsText(input.files[0], 'UTF-8');
  input.value = '';
}

/**
 * Parse a single CSV line respecting quoted fields.
 * Handles fields wrapped in double quotes that may contain the delimiter or newlines.
 */
function _parseCSVLine(line, delimiter) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        current += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === delimiter) {
        fields.push(current.trim());
        current = '';
        i++;
      } else {
        current += ch;
        i++;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Auto-detect CSV delimiter: comma or semicolon.
 * Checks the header line for which delimiter produces more columns.
 */
function _detectCSVDelimiter(headerLine) {
  const semicolonCount = (headerLine.match(/;/g) || []).length;
  const commaCount = (headerLine.match(/,/g) || []).length;
  /* If header has quoted fields, commas inside quotes shouldn't count.
     But for the header row this is rare, so simple count works well. */
  if (semicolonCount > 0 && semicolonCount >= commaCount) return ';';
  if (commaCount > 0) return ',';
  /* fallback: try tab */
  if (headerLine.includes('\t')) return '\t';
  return ',';
}

function processCSV() {
  const raw = document.getElementById('csv-input').value.trim();
  if (!raw) return;

  /* Split into lines, handling possible \r\n and multi-line quoted fields */
  const lines = [];
  let currentLine = '';
  let inQuotes = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') inQuotes = !inQuotes;
    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && i + 1 < raw.length && raw[i + 1] === '\n') i++;
      if (currentLine.trim()) lines.push(currentLine);
      currentLine = '';
    } else {
      currentLine += ch;
    }
  }
  if (currentLine.trim()) lines.push(currentLine);

  if (lines.length < 2) {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'warning',
      title: 'Necessário cabeçalho + pelo menos 1 linha',
      showConfirmButton: false,
      timer: 2500,
      background: '#1c1c1c',
      color: '#e5e5e5',
    });
    return;
  }

  /* Auto-detect delimiter from header line */
  const delimiter = _detectCSVDelimiter(lines[0]);

  /* Map common CSV header names to builtin variable keys */
  const HEADER_ALIASES = {
    aluno: 'nome',
    name: 'nome',
    student: 'nome',
    estudante: 'nome',
    participante: 'nome',
    nome_completo: 'nome',
    nome_aluno: 'nome',
    course: 'curso',
    materia: 'curso',
    disciplina: 'curso',
  };

  /* First line = header with variable keys */
  const rawHeaders = _parseCSVLine(lines[0], delimiter);
  const headers = rawHeaders.map((h) => {
    let key = h
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
    /* Map aliases to builtin keys */
    if (HEADER_ALIASES[key]) key = HEADER_ALIASES[key];
    return key;
  });

  /* Auto-create any variables that don't exist yet */
  headers.forEach((key) => {
    if (key && !state.variables.find((v) => v.key === key)) {
      /* Use the original header text (capitalized) as label */
      const idx = headers.indexOf(key);
      const label = rawHeaders[idx] ? rawHeaders[idx].trim() : key;
      state.addVariable(key, label.charAt(0).toUpperCase() + label.slice(1));
    }
  });

  const items = lines
    .slice(1)
    .map((l) => {
      const parts = _parseCSVLine(l, delimiter);
      const data = {};
      headers.forEach((key, idx) => {
        if (key) data[key] = (parts[idx] || '').trim();
      });
      return data;
    })
    .filter((i) => Object.values(i).some((v) => v));

  if (items.length) {
    state.setStudents(items);
    renderStudents();
    updateStudentNav();
    renderVariableTags();
    canvas.renderAll();
    generatePreview();
    closeModal('modal-csv');
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `${items.length} aluno(s) importados!`,
      showConfirmButton: false,
      timer: 2000,
      background: '#1c1c1c',
      color: '#e5e5e5',
    });
  }
}

/* ═══════════════════════════════════════════
   CONFIG SAVE / LOAD
   ═══════════════════════════════════════════ */
async function saveConfigToServer() {
  if (!state.template) {
    Swal.fire({
      icon: 'warning',
      title: 'Selecione um template',
      background: '#1c1c1c',
      color: '#e5e5e5',
    });
    return;
  }
  showLoader('Salvando...');
  try {
    await API.saveConfig(state.template, state.getUIConfig());
    state.saveToLocal(); /* also persist in browser */
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Configuração salva!',
      showConfirmButton: false,
      timer: 2000,
      background: '#1c1c1c',
      color: '#e5e5e5',
    });
  } catch (e) {
    Swal.fire({
      icon: 'error',
      title: 'Erro',
      text: e.message,
      background: '#1c1c1c',
      color: '#e5e5e5',
    });
  }
  hideLoader();
}

/* ═══════════════════════════════════════════
   BATCH GENERATION
   ═══════════════════════════════════════════ */
async function generateBatch() {
  if (!state.template) {
    Swal.fire({
      icon: 'warning',
      title: 'Selecione um template',
      background: '#1c1c1c',
      color: '#e5e5e5',
    });
    return;
  }
  if (!state.students.length) {
    Swal.fire({
      icon: 'warning',
      title: 'Adicione alunos primeiro',
      background: '#1c1c1c',
      color: '#e5e5e5',
    });
    return;
  }

  const result = await Swal.fire({
    title: 'Formato de download',
    text: 'Deseja um único PDF com todos os certificados ou um arquivo ZIP com eles separados?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'PDF Único',
    denyButtonText: 'Arquivos Separados (ZIP)',
    showDenyButton: true,
    background: '#1c1c1c',
    color: '#e5e5e5',
    confirmButtonColor: '#3085d6',
    denyButtonColor: '#28a745',
    cancelButtonText: 'Cancelar'
  });

  if (result.isDismissed) return;
  const combinePdf = result.isConfirmed;

  showLoader(`Gerando ${state.students.length} certificado(s)...`);
  try {
    const items = state.students.map((s) => ({ ...s }));
    const r = await API.generateBatch(state.template, state.getUIConfig(), items, combinePdf);
    hideLoader();

    if (r.url) {
      /* confetti */
      try {
        const jsc = new JSConfetti();
        jsc.addConfetti();
      } catch {}

      const isZip = r.url.toLowerCase().endsWith('.zip');
      Swal.fire({
        icon: 'success',
        title: 'Lote gerado!',
        text: `${items.length} certificado(s)`,
        confirmButtonText: isZip ? 'Baixar ZIP' : 'Baixar PDF',
        background: '#1c1c1c',
        color: '#e5e5e5',
      }).then((res) => {
        if (res.isConfirmed) window.open(r.url, '_blank');
      });
    }
  } catch (e) {
    hideLoader();
    Swal.fire({
      icon: 'error',
      title: 'Erro',
      text: e.message,
      background: '#1c1c1c',
      color: '#e5e5e5',
    });
  }
}

/* ═══════════════════════════════════════════
   ZOOM CONTROLS
   ═══════════════════════════════════════════ */
function zoomIn() {
  state.zoom += 0.1;
  canvas.applyZoom();
}
function zoomOut() {
  state.zoom -= 0.1;
  canvas.applyZoom();
}
function zoomReset() {
  state.zoom = 1;
  canvas.applyZoom();
}
function zoomFit() {
  const vp = document.getElementById('viewport');
  if (!vp || !state.pageW) return;
  const pad = 100;
  const scaleW = (vp.clientWidth - pad) / state.pageW;
  const scaleH = (vp.clientHeight - pad) / state.pageH;
  state.zoom = Math.min(scaleW, scaleH, 2);
  canvas.applyZoom();
}

/* global toggle proxies */
function toggleGrid() {
  canvas.toggleGrid();
}
function toggleRulers() {
  canvas.toggleRulers();
}
function toggleSnap() {
  canvas.toggleSnap();
}

/* ═══════════════════════════════════════════
   MODALS & LOADER
   ═══════════════════════════════════════════ */
function showLoader(txt) {
  const l = document.getElementById('loader');
  const t = document.getElementById('loader-text');
  if (t) t.textContent = txt || 'Processando...';
  if (l) l.classList.remove('hidden');
}
function hideLoader() {
  const l = document.getElementById('loader');
  if (l) l.classList.add('hidden');
}
function closeModal(id) {
  document.getElementById(id)?.classList.add('hidden');
}

function showHelp() {
  document.getElementById('modal-help')?.classList.remove('hidden');
}

/* ═══════════════════════════════════════════
   RULER BTN INIT
   ═══════════════════════════════════════════ */
function initRulerBtn() {
  document.getElementById('btn-rulers')?.classList.add('on');
  document.getElementById('btn-snap')?.classList.add('on');

  /* viewport scroll → redraw rulers */
  const vp = document.getElementById('viewport');
  if (vp) vp.addEventListener('scroll', () => canvas.drawRulers());

  /* mouse wheel zoom */
  if (vp)
    vp.addEventListener(
      'wheel',
      (e) => {
        if (e.ctrlKey) {
          e.preventDefault();
          state.zoom += e.deltaY < 0 ? 0.05 : -0.05;
          canvas.applyZoom();
        }
      },
      { passive: false },
    );

  /* render students list */
  renderStudents();
  updateStudentNav();
}

/* ═══════════════════════════════════════════
   KEYBOARD SHORTCUTS
   ═══════════════════════════════════════════ */
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    saveConfigToServer();
  }
  if (e.ctrlKey && e.key === 'z') {
    e.preventDefault();
    canvas.undoAction();
  }
  if (e.ctrlKey && e.key === 'y') {
    e.preventDefault();
    canvas.redoAction();
  }
  if (e.ctrlKey && e.key === '0') {
    e.preventDefault();
    zoomFit();
  }
  if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
    e.preventDefault();
    zoomIn();
  }
  if (e.ctrlKey && e.key === '-') {
    e.preventDefault();
    zoomOut();
  }
  if (e.ctrlKey && e.key === 'd') {
    e.preventDefault();
    const sel = state.getSelected();
    if (sel && state.fields.includes(sel)) {
      const dup = state.duplicateField(sel.id);
      if (dup) {
        canvas.renderAll();
        canvas.selectElement(dup.id);
        generatePreview();
      }
    }
  }
});
