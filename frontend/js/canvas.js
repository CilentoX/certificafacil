/* ===== CANVAS CONTROLLER ===== */
const canvas = (() => {
  /* ── DOM refs ── */
  const $viewport = () => document.getElementById('viewport');
  const $scrollArea = () => document.getElementById('scroll-area');
  const $canvasWrap = () => document.getElementById('canvas-wrap');
  const $certImg = () => document.getElementById('cert-img');
  const $dynEls = () => document.getElementById('dyn-els');
  const $rulerH = () => document.getElementById('ruler-hc');
  const $rulerV = () => document.getElementById('ruler-vc');
  const $snapH = () => document.getElementById('snap-h');
  const $snapV = () => document.getElementById('snap-v');
  const $gridOverlay = () => document.getElementById('grid-overlay');

  let _showRulers = true;
  let _showGrid = false;
  let _snapEnabled = true;
  const SNAP_THRESHOLD = 5; // px threshold for snapping

  /* ═══════════════ RENDER ELEMENTS ═══════════════ */

  function renderAll() {
    const $d = $dynEls();
    if (!$d) return;
    $d.innerHTML = '';

    state.fields.forEach((f) => {
      const el = _createElDiv(f, 'text');
      $d.appendChild(el);
    });
    state.images.forEach((img) => {
      const el = _createImgDiv(img);
      $d.appendChild(el);
    });

    _applyZoom();
    _initInteract();
    lucide.createIcons();
  }

  function _createElDiv(f, type) {
    const d = document.createElement('div');
    d.className = 'dyn-el' + (state.selectedId === f.id ? ' selected' : '');
    d.dataset.id = f.id;
    d.style.left = f.x + 'px';
    d.style.top = f.y + 'px';
    d.style.width = f.w + 'px';
    d.style.height = f.h + 'px';
    if (f.opacity !== undefined && f.opacity < 100) d.style.opacity = f.opacity / 100;
    if (f.rotation) d.style.transform = `rotate(${f.rotation}deg)`;

    /* label */
    const lbl = document.createElement('div');
    lbl.className = 'el-label';
    lbl.textContent = (f.content || '').substring(0, 20) || 'Campo';
    d.appendChild(lbl);

    /* preview text */
    const txt = document.createElement('div');
    txt.style.cssText = `width:100%;height:100%;overflow:hidden;display:flex;align-items:center;
      font-family:${f.font || 'Arial'},sans-serif;font-size:${f.fontSize || 18}px;color:${f.color || '#000'};
      justify-content:${f.align === 'right' ? 'flex-end' : f.align === 'left' ? 'flex-start' : 'center'};
      line-height:${f.lineHeight || 1.2};letter-spacing:${f.letterSpacing || 0}px;padding:2px 4px;
      text-align:${f.align || 'center'};white-space:nowrap;pointer-events:none;opacity:.7`;
    const stu = state.currentStudent();
    let preview = f.content || '';
    /* replace all {variable} placeholders dynamically */
    preview = preview.replace(/\{(\w+)\}/gi, (match, key) => {
      return stu[key.toLowerCase()] || match;
    });
    preview = preview
      .replace(/\[B\]/g, '')
      .replace(/\[\/B\]/g, '')
      .replace(/\[I\]/g, '')
      .replace(/\[\/I\]/g, '');
    txt.textContent = preview;
    d.appendChild(txt);

    /* handles */
    ['tl', 'tc', 'tr', 'ml', 'mr', 'bl', 'bc', 'br'].forEach((h) => {
      const hd = document.createElement('div');
      hd.className = 'handle ' + h;
      d.appendChild(hd);
    });

    d.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      selectElement(f.id);
    });

    return d;
  }

  function _createImgDiv(img) {
    const d = document.createElement('div');
    d.className = 'dyn-el dyn-el-img' + (state.selectedId === img.id ? ' selected' : '');
    d.dataset.id = img.id;
    d.style.left = img.x + 'px';
    d.style.top = img.y + 'px';
    d.style.width = img.w + 'px';
    d.style.height = img.h + 'px';
    if (img.opacity !== undefined && img.opacity < 100) d.style.opacity = img.opacity / 100;
    if (img.rot) d.style.transform = `rotate(${img.rot}deg)`;

    const im = document.createElement('img');
    im.src = '/' + img.path;
    im.draggable = false;
    d.appendChild(im);

    ['tl', 'tc', 'tr', 'ml', 'mr', 'bl', 'bc', 'br'].forEach((h) => {
      const hd = document.createElement('div');
      hd.className = 'handle ' + h;
      d.appendChild(hd);
    });

    d.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      selectElement(img.id);
    });
    return d;
  }

  /* ═══════════════ SELECTION ═══════════════ */

  function selectElement(id) {
    state.selectedId = id;
    document
      .querySelectorAll('.dyn-el')
      .forEach((d) => d.classList.toggle('selected', d.dataset.id === id));
    if (typeof syncPanelToSelection === 'function') syncPanelToSelection();
  }

  function deselect() {
    state.selectedId = null;
    document.querySelectorAll('.dyn-el.selected').forEach((d) => d.classList.remove('selected'));
    if (typeof syncPanelToSelection === 'function') syncPanelToSelection();
  }

  /* ═══════════════ SNAP ENGINE ═══════════════ */

  function _getSnapTargets(excludeId) {
    const targets = [];
    // Page edges and center
    targets.push(
      { type: 'v', val: 0, label: 'page-left' },
      { type: 'v', val: state.pageW, label: 'page-right' },
      { type: 'v', val: state.pageW / 2, label: 'page-centerX' },
      { type: 'h', val: 0, label: 'page-top' },
      { type: 'h', val: state.pageH, label: 'page-bottom' },
      { type: 'h', val: state.pageH / 2, label: 'page-centerY' },
    );
    // Other elements edges & centers
    const allEls = [...state.fields, ...state.images];
    allEls.forEach((el) => {
      if (el.id === excludeId) return;
      const cx = el.x + (el.w || 0) / 2;
      const cy = el.y + (el.h || 0) / 2;
      const r = el.x + (el.w || 0);
      const b = el.y + (el.h || 0);
      targets.push(
        { type: 'v', val: el.x, label: 'el-left' },
        { type: 'v', val: r, label: 'el-right' },
        { type: 'v', val: cx, label: 'el-centerX' },
        { type: 'h', val: el.y, label: 'el-top' },
        { type: 'h', val: b, label: 'el-bottom' },
        { type: 'h', val: cy, label: 'el-centerY' },
      );
    });
    return targets;
  }

  function _computeSnap(f) {
    if (!_snapEnabled) return { dx: 0, dy: 0, snapLines: [] };

    const targets = _getSnapTargets(f.id);
    const fCx = f.x + (f.w || 0) / 2;
    const fCy = f.y + (f.h || 0) / 2;
    const fR = f.x + (f.w || 0);
    const fB = f.y + (f.h || 0);

    // Points to test for this element
    const xPoints = [f.x, fCx, fR];
    const yPoints = [f.y, fCy, fB];

    let bestDx = Infinity,
      bestDy = Infinity;
    let snapDx = 0,
      snapDy = 0;
    const snapLines = [];

    targets.forEach((t) => {
      if (t.type === 'v') {
        xPoints.forEach((px) => {
          const dist = Math.abs(px - t.val);
          if (dist < SNAP_THRESHOLD && dist < Math.abs(bestDx)) {
            bestDx = dist;
            snapDx = t.val - px;
          }
        });
      } else {
        yPoints.forEach((py) => {
          const dist = Math.abs(py - t.val);
          if (dist < SNAP_THRESHOLD && dist < Math.abs(bestDy)) {
            bestDy = dist;
            snapDy = t.val - py;
          }
        });
      }
    });

    // Collect active snap lines for rendering
    if (bestDx !== Infinity) {
      const snappedX = f.x + snapDx;
      const snappedCx = fCx + snapDx;
      const snappedR = fR + snapDx;
      targets
        .filter((t) => t.type === 'v')
        .forEach((t) => {
          if (
            Math.abs(snappedX - t.val) < 0.5 ||
            Math.abs(snappedCx - t.val) < 0.5 ||
            Math.abs(snappedR - t.val) < 0.5
          ) {
            snapLines.push({ type: 'v', val: t.val });
          }
        });
    }
    if (bestDy !== Infinity) {
      const snappedY = f.y + snapDy;
      const snappedCy = fCy + snapDy;
      const snappedB = fB + snapDy;
      targets
        .filter((t) => t.type === 'h')
        .forEach((t) => {
          if (
            Math.abs(snappedY - t.val) < 0.5 ||
            Math.abs(snappedCy - t.val) < 0.5 ||
            Math.abs(snappedB - t.val) < 0.5
          ) {
            snapLines.push({ type: 'h', val: t.val });
          }
        });
    }

    return {
      dx: bestDx !== Infinity ? snapDx : 0,
      dy: bestDy !== Infinity ? snapDy : 0,
      snapLines,
    };
  }

  function _renderSnapLines(snapLines) {
    // Remove old dynamic snap lines
    document.querySelectorAll('.snap-guide-dynamic').forEach((el) => el.remove());

    const wrap = $canvasWrap();
    if (!wrap) return;

    const unique = [];
    const seen = new Set();
    snapLines.forEach((s) => {
      const key = s.type + '-' + Math.round(s.val);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(s);
      }
    });

    unique.forEach((s) => {
      const line = document.createElement('div');
      line.className = 'snap-guide-dynamic';
      if (s.type === 'v') {
        line.style.cssText = `position:absolute;top:0;bottom:0;left:${s.val}px;width:1px;background:var(--accent);pointer-events:none;z-index:50;opacity:0.8;`;
      } else {
        line.style.cssText = `position:absolute;left:0;right:0;top:${s.val}px;height:1px;background:var(--accent);pointer-events:none;z-index:50;opacity:0.8;`;
      }
      wrap.appendChild(line);
    });
  }

  function _clearSnapLines() {
    document.querySelectorAll('.snap-guide-dynamic').forEach((el) => el.remove());
    $snapH()?.classList.add('hidden');
    $snapV()?.classList.add('hidden');
  }

  /* ═══════════════ INTERACT.JS ═══════════════ */

  function _initInteract() {
    if (typeof interact === 'undefined') return;

    interact('.dyn-el')
      .draggable({
        listeners: {
          start(ev) {
            state.pushUndo();
            ev.target.classList.add('dragging');
          },
          move(ev) {
            const el = ev.target;
            const id = el.dataset.id;
            const z = state.zoom;
            const f =
              state.fields.find((f) => f.id === id) || state.images.find((i) => i.id === id);
            if (!f || f.locked) return;

            // Sub-pixel precision: accumulate fractional movement
            if (!f._dragAccX) f._dragAccX = 0;
            if (!f._dragAccY) f._dragAccY = 0;
            f._dragAccX += ev.dx / z;
            f._dragAccY += ev.dy / z;

            f.x = Math.round((f.x || 0) + f._dragAccX);
            f.y = Math.round((f.y || 0) + f._dragAccY);
            f._dragAccX -= Math.round(f._dragAccX);
            f._dragAccY -= Math.round(f._dragAccY);

            // Snap
            const snap = _computeSnap(f);
            if (snap.dx !== 0) f.x += snap.dx;
            if (snap.dy !== 0) f.y += snap.dy;

            // Boundary clamp: keep at least 20px on page
            const minVisible = 20;
            f.x = Math.max(-f.w + minVisible, Math.min(state.pageW - minVisible, f.x));
            f.y = Math.max(-f.h + minVisible, Math.min(state.pageH - minVisible, f.y));

            el.style.left = f.x + 'px';
            el.style.top = f.y + 'px';

            _renderSnapLines(snap.snapLines);
            _updatePosInputs(f);
          },
          end(ev) {
            const el = ev.target;
            const id = el.dataset.id;
            const f =
              state.fields.find((f) => f.id === id) || state.images.find((i) => i.id === id);
            if (f) {
              delete f._dragAccX;
              delete f._dragAccY;
            }
            el.classList.remove('dragging');
            _clearSnapLines();
            if (typeof generatePreview === 'function') generatePreview();
          },
        },
      })
      .resizable({
        edges: {
          left: '.handle.ml,.handle.tl,.handle.bl',
          right: '.handle.mr,.handle.tr,.handle.br',
          top: '.handle.tl,.handle.tc,.handle.tr',
          bottom: '.handle.bl,.handle.bc,.handle.br',
        },
        listeners: {
          start(ev) {
            state.pushUndo();
            ev.target.classList.add('resizing');
          },
          move(ev) {
            const el = ev.target;
            const id = el.dataset.id;
            const z = state.zoom;
            const f =
              state.fields.find((f) => f.id === id) || state.images.find((i) => i.id === id);
            if (!f || f.locked) return;

            f.w = Math.max(20, Math.round(ev.rect.width / z));
            f.h = Math.max(10, Math.round(ev.rect.height / z));
            f.x = Math.round(f.x + ev.deltaRect.left / z);
            f.y = Math.round(f.y + ev.deltaRect.top / z);

            el.style.left = f.x + 'px';
            el.style.top = f.y + 'px';
            el.style.width = f.w + 'px';
            el.style.height = f.h + 'px';

            _updatePosInputs(f);

            // Show dimensions tooltip
            _showDimTooltip(el, f);
          },
          end(ev) {
            ev.target.classList.remove('resizing');
            _hideDimTooltip();
            if (typeof generatePreview === 'function') generatePreview();
          },
        },
      });
  }

  /* ── Dimension tooltip during resize ── */
  let _dimTooltip = null;
  function _showDimTooltip(el, f) {
    if (!_dimTooltip) {
      _dimTooltip = document.createElement('div');
      _dimTooltip.className = 'dim-tooltip';
      document.body.appendChild(_dimTooltip);
    }
    _dimTooltip.textContent = `${f.w} × ${f.h}`;
    const rect = el.getBoundingClientRect();
    _dimTooltip.style.left = rect.left + rect.width / 2 + 'px';
    _dimTooltip.style.top = rect.bottom + 8 + 'px';
    _dimTooltip.classList.add('visible');
  }
  function _hideDimTooltip() {
    if (_dimTooltip) _dimTooltip.classList.remove('visible');
  }

  function _updatePosInputs(f) {
    if (state.selectedId !== f.id) return;
    const px = document.getElementById('pos-x');
    const py = document.getElementById('pos-y');
    const pw = document.getElementById('pos-w');
    const ph = document.getElementById('pos-h');
    if (px) px.value = f.x;
    if (py) py.value = f.y;
    if (pw && f.w !== undefined) pw.value = f.w;
    if (ph && f.h !== undefined) ph.value = f.h;
  }

  /* ═══════════════ LIVE DOM UPDATE (no re-render) ═══════════════ */

  function _liveUpdateElement(f) {
    const el = document.querySelector(`.dyn-el[data-id="${f.id}"]`);
    if (!el) return false;
    el.style.left = f.x + 'px';
    el.style.top = f.y + 'px';
    if (f.w !== undefined) el.style.width = f.w + 'px';
    if (f.h !== undefined) el.style.height = f.h + 'px';
    _updatePosInputs(f);
    return true;
  }

  /* ═══════════════ ZOOM ═══════════════ */

  function _applyZoom() {
    const wrap = $canvasWrap();
    if (!wrap) return;
    wrap.style.transform = `scale(${state.zoom})`;
    wrap.style.transformOrigin = 'center center';
    document.getElementById('zoom-val').textContent = Math.round(state.zoom * 100);
    drawRulers();
  }

  /* ═══════════════ RULERS ═══════════════ */

  function drawRulers() {
    if (!_showRulers) return;
    _drawRulerH();
    _drawRulerV();
  }

  function _drawRulerH() {
    const c = $rulerH();
    if (!c) return;
    const vp = $viewport();
    if (!vp) return;
    const dpr = window.devicePixelRatio || 1;
    const w = vp.clientWidth;
    c.width = w * dpr;
    c.height = 24 * dpr;
    c.style.width = w + 'px';
    c.style.height = '24px';
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#161616';
    ctx.fillRect(0, 0, w, 24);

    const z = state.zoom;
    const scrollLeft = vp.scrollLeft || 0;
    const step = z >= 0.5 ? 50 : 100;

    ctx.fillStyle = '#666';
    ctx.font = '9px Inter, sans-serif';
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 0.5;

    for (let pt = 0; pt <= state.pageW + step; pt += step) {
      const px = pt * z - scrollLeft + 60;
      if (px < 0 || px > w) continue;
      ctx.beginPath();
      ctx.moveTo(px, 14);
      ctx.lineTo(px, 24);
      ctx.stroke();
      ctx.fillText(pt.toString(), px + 2, 11);
    }
  }

  function _drawRulerV() {
    const c = $rulerV();
    if (!c) return;
    const vp = $viewport();
    if (!vp) return;
    const dpr = window.devicePixelRatio || 1;
    const h = vp.clientHeight;
    c.width = 24 * dpr;
    c.height = h * dpr;
    c.style.width = '24px';
    c.style.height = h + 'px';
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#161616';
    ctx.fillRect(0, 0, 24, h);

    const z = state.zoom;
    const scrollTop = vp.scrollTop || 0;
    const step = z >= 0.5 ? 50 : 100;

    ctx.fillStyle = '#666';
    ctx.font = '9px Inter, sans-serif';
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 0.5;

    for (let pt = 0; pt <= state.pageH + step; pt += step) {
      const py = pt * z - scrollTop + 60;
      if (py < 0 || py > h) continue;
      ctx.beginPath();
      ctx.moveTo(14, py);
      ctx.lineTo(24, py);
      ctx.stroke();
      ctx.save();
      ctx.translate(11, py + 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(pt.toString(), 0, 0);
      ctx.restore();
    }
  }

  /* ═══════════════ TOGGLES ═══════════════ */

  function toggleGrid() {
    _showGrid = !_showGrid;
    const g = $gridOverlay();
    if (g) g.classList.toggle('hidden', !_showGrid);
    document.getElementById('btn-grid')?.classList.toggle('on', _showGrid);
  }

  function toggleRulers() {
    _showRulers = !_showRulers;
    document.getElementById('workspace')?.classList.toggle('no-rulers', !_showRulers);
    document.getElementById('btn-rulers')?.classList.toggle('on', _showRulers);
    if (_showRulers) drawRulers();
  }

  function toggleSnap() {
    _snapEnabled = !_snapEnabled;
    document.getElementById('btn-snap')?.classList.toggle('on', _snapEnabled);
  }

  /* ═══════════════ UNDO/REDO ═══════════════ */

  function undoAction() {
    if (state.undo()) {
      renderAll();
      if (typeof generatePreview === 'function') generatePreview();
    }
  }
  function redoAction() {
    if (state.redo()) {
      renderAll();
      if (typeof generatePreview === 'function') generatePreview();
    }
  }

  /* ═══════════════ CURSOR POS ═══════════════ */

  function initCursorTracker() {
    const wrap = $canvasWrap();
    if (!wrap) return;
    wrap.addEventListener('mousemove', (e) => {
      const rect = wrap.getBoundingClientRect();
      const z = state.zoom;
      const x = Math.round((e.clientX - rect.left) / z);
      const y = Math.round((e.clientY - rect.top) / z);
      const cp = document.getElementById('cursor-pos');
      if (cp) cp.textContent = `X: ${x}  Y: ${y}`;
    });
  }

  /* public */
  return {
    renderAll,
    selectElement,
    deselect,
    drawRulers,
    toggleGrid,
    toggleRulers,
    toggleSnap,
    undoAction,
    redoAction,
    initCursorTracker,
    applyZoom: _applyZoom,
    liveUpdate: _liveUpdateElement,
  };
})();

/* ═══ Keyboard navigation for elements ═══ */
document.addEventListener('keydown', (e) => {
  if (!state.selectedId) return;
  if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')
    return;

  const f = state.getSelected();
  if (!f || f.locked) return;

  const step = e.shiftKey ? 10 : 1;
  let moved = false;

  if (e.key === 'ArrowLeft') {
    state.pushUndo();
    f.x -= step;
    moved = true;
  }
  if (e.key === 'ArrowRight') {
    state.pushUndo();
    f.x += step;
    moved = true;
  }
  if (e.key === 'ArrowUp') {
    state.pushUndo();
    f.y -= step;
    moved = true;
  }
  if (e.key === 'ArrowDown') {
    state.pushUndo();
    f.y += step;
    moved = true;
  }

  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    if (state.fields.find((x) => x.id === state.selectedId)) state.removeField(state.selectedId);
    else state.removeImage(state.selectedId);
    canvas.renderAll();
    if (typeof generatePreview === 'function') generatePreview();
    return;
  }

  if (moved) {
    e.preventDefault();
    // Live update DOM instead of full re-render for smooth keyboard movement
    if (!canvas.liveUpdate(f)) {
      canvas.renderAll();
    }
    if (typeof generatePreview === 'function') generatePreview();
  }
});
