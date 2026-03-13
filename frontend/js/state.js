/* ===== STATE MANAGEMENT ===== */
const state = (() => {
  const LS_KEY = 'certgen_state';
  const LS_STUDENTS_KEY = 'certgen_students';
  const LS_PREFS_KEY = 'certgen_prefs';

  let _template = '';
  let _pageW = 841,
    _pageH = 595;
  let _zoom = 1;
  let _selectedId = null;
  let _studentIdx = 0;

  /* text fields: { id, content, font, fontSize, color, align, lineHeight, letterSpacing, autoResize, x, y, w, h, opacity, rotation, visible, locked } */
  let _fields = [];
  /* overlay images: { id, path, x, y, w, h, rot, opacity, visible, locked } */
  let _images = [];
  /* variables: { key, label, builtin } */
  let _variables = [
    { key: 'nome', label: 'Nome', builtin: true },
    { key: 'curso', label: 'Curso', builtin: true },
  ];
  /* students: dynamic keys matching variables */
  let _students = [{ nome: 'Nome Exemplo', curso: 'Curso Exemplo' }];

  /* undo / redo */
  let _undoStack = [];
  let _redoStack = [];
  const MAX_UNDO = 40;

  /* ── Auto-save debounce ── */
  let _saveTimer = null;
  function _scheduleSave() {
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(_saveToLocal, 500);
  }

  /* ── localStorage persistence ── */
  function _saveToLocal() {
    try {
      const data = {
        template: _template,
        pageW: _pageW,
        pageH: _pageH,
        zoom: _zoom,
        fields: _fields,
        images: _images,
        variables: _variables,
      };
      localStorage.setItem(LS_KEY, JSON.stringify(data));
      localStorage.setItem(LS_STUDENTS_KEY, JSON.stringify(_students));
    } catch (e) {
      console.warn('[State] localStorage save error:', e);
    }
  }

  function _loadFromLocal() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.template) _template = d.template;
        if (d.pageW) {
          _pageW = d.pageW;
          _pageH = d.pageH;
        }
        if (d.zoom) _zoom = d.zoom;
        if (d.fields) _fields = d.fields;
        if (d.images) _images = d.images;
        if (d.variables && Array.isArray(d.variables)) _variables = d.variables;
      }
      const stuRaw = localStorage.getItem(LS_STUDENTS_KEY);
      if (stuRaw) {
        const stu = JSON.parse(stuRaw);
        if (Array.isArray(stu) && stu.length) {
          /* Migrate old {name, course} format to {nome, curso} */
          _students = stu.map((s) => {
            if (s.name !== undefined && s.nome === undefined) {
              return { nome: s.name, curso: s.course || '', ...s };
            }
            return s;
          });
        }
      }
    } catch (e) {
      console.warn('[State] localStorage load error:', e);
    }
  }

  function _savePrefs(prefs) {
    try {
      localStorage.setItem(LS_PREFS_KEY, JSON.stringify(prefs));
    } catch (e) {}
  }
  function _loadPrefs() {
    try {
      const raw = localStorage.getItem(LS_PREFS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function _snap() {
    return JSON.stringify({ fields: _fields, images: _images });
  }
  function pushUndo() {
    _undoStack.push(_snap());
    if (_undoStack.length > MAX_UNDO) _undoStack.shift();
    _redoStack = [];
    _scheduleSave();
  }
  function undo() {
    if (!_undoStack.length) return false;
    _redoStack.push(_snap());
    const s = JSON.parse(_undoStack.pop());
    _fields = s.fields;
    _images = s.images;
    return true;
  }
  function redo() {
    if (!_redoStack.length) return false;
    _undoStack.push(_snap());
    const s = JSON.parse(_redoStack.pop());
    _fields = s.fields;
    _images = s.images;
    return true;
  }

  /* Generate unique id */
  let _idCounter = 0;
  function newId() {
    return 'el_' + ++_idCounter + '_' + Date.now().toString(36);
  }

  return {
    /* ── Template ── */
    get template() {
      return _template;
    },
    set template(v) {
      _template = v;
    },
    get pageW() {
      return _pageW;
    },
    get pageH() {
      return _pageH;
    },
    setPageDims(w, h) {
      _pageW = w;
      _pageH = h;
    },

    /* ── Zoom ── */
    get zoom() {
      return _zoom;
    },
    set zoom(v) {
      _zoom = Math.max(0.1, Math.min(5, v));
    },

    /* ── Selection ── */
    get selectedId() {
      return _selectedId;
    },
    set selectedId(v) {
      _selectedId = v;
    },
    getSelected() {
      return (
        _fields.find((f) => f.id === _selectedId) ||
        _images.find((i) => i.id === _selectedId) ||
        null
      );
    },

    /* ── Text Fields ── */
    get fields() {
      return _fields;
    },
    addField(overrides = {}) {
      pushUndo();
      const f = {
        id: newId(),
        content: '{nome}',
        font: 'Arial',
        fontSize: 24,
        color: '#000000',
        align: 'center',
        lineHeight: 1.2,
        letterSpacing: 0,
        autoResize: true,
        opacity: 100,
        rotation: 0,
        visible: true,
        locked: false,
        x: _pageW * 0.2,
        y: _pageH * 0.45,
        w: _pageW * 0.6,
        h: 40,
        ...overrides,
      };
      _fields.push(f);
      return f;
    },
    removeField(id) {
      pushUndo();
      _fields = _fields.filter((f) => f.id !== id);
      if (_selectedId === id) _selectedId = null;
    },
    updateField(id, key, val) {
      const f = _fields.find((f) => f.id === id);
      if (f) f[key] = val;
    },
    duplicateField(id) {
      const src = _fields.find((f) => f.id === id);
      if (!src) return null;
      pushUndo();
      const dup = { ...src, id: newId(), x: src.x + 20, y: src.y + 20 };
      _fields.push(dup);
      return dup;
    },

    /* ── Images ── */
    get images() {
      return _images;
    },
    addImage(path, w = 100, h = 100) {
      pushUndo();
      const img = {
        id: newId(),
        path,
        x: 50,
        y: 50,
        w,
        h,
        rot: 0,
        opacity: 100,
        visible: true,
        locked: false,
      };
      _images.push(img);
      return img;
    },
    removeImage(id) {
      pushUndo();
      _images = _images.filter((i) => i.id !== id);
      if (_selectedId === id) _selectedId = null;
    },
    updateImage(id, key, val) {
      const i = _images.find((i) => i.id === id);
      if (i) i[key] = val;
    },

    /* ── Variables ── */
    get variables() {
      return _variables;
    },
    addVariable(key, label) {
      key = key.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      if (_variables.find((v) => v.key === key)) return null;
      const v = { key, label: label || key, builtin: false };
      _variables.push(v);
      /* add empty value to all students */
      _students.forEach((s) => {
        if (!(key in s)) s[key] = '';
      });
      _scheduleSave();
      return v;
    },
    removeVariable(key) {
      _variables = _variables.filter((v) => v.key !== key || v.builtin);
      /* remove key from students */
      _students.forEach((s) => delete s[key]);
      _scheduleSave();
    },

    /* ── Students ── */
    get students() {
      return _students;
    },
    get studentIdx() {
      return _studentIdx;
    },
    set studentIdx(v) {
      _studentIdx = Math.max(0, Math.min(v, _students.length - 1));
    },
    currentStudent() {
      return _students[_studentIdx] || {};
    },
    addStudent(data) {
      /* data is an object { nome: '...', curso: '...', customVar: '...' } */
      if (typeof data === 'string') {
        /* backwards compat: addStudent(name, course) */
        const name = data;
        const course = arguments[1] || '';
        data = { nome: name, curso: course };
      }
      _students.push(data);
      _scheduleSave();
    },
    removeStudent(idx) {
      _students.splice(idx, 1);
      if (!_students.length) {
        const empty = {};
        _variables.forEach((v) => (empty[v.key] = ''));
        _students.push(empty);
      }
      if (_studentIdx >= _students.length) _studentIdx = _students.length - 1;
      _scheduleSave();
    },
    removeStudents(indices) {
      /* indices is an array of indices to remove */
      const sorted = [...indices].sort((a, b) => b - a);
      sorted.forEach((idx) => {
        if (idx >= 0 && idx < _students.length) {
          _students.splice(idx, 1);
        }
      });
      if (!_students.length) {
        const empty = {};
        _variables.forEach((v) => (empty[v.key] = ''));
        _students.push(empty);
      }
      _studentIdx = 0;
      _scheduleSave();
    },
    clearStudents() {
      const empty = {};
      _variables.forEach((v) => (empty[v.key] = ''));
      _students = [empty];
      _studentIdx = 0;
      _scheduleSave();
    },
    setStudents(arr) {
      _students = arr.length
        ? arr
        : (() => {
            const e = {};
            _variables.forEach((v) => (e[v.key] = ''));
            return [e];
          })();
      _studentIdx = 0;
      _scheduleSave();
    },

    /* ── Undo/Redo ── */
    pushUndo,
    undo,
    redo,

    /* ── Config (for API) ── */
    getUIConfig() {
      return {
        text_fields: _fields.map((f) => ({
          content: f.content,
          font: f.font,
          font_size: f.fontSize,
          color: f.color,
          align: f.align,
          line_height: f.lineHeight,
          letter_spacing: f.letterSpacing,
          auto_resize: f.autoResize,
          rect: [f.x, f.y, f.x + f.w, f.y + f.h],
        })),
        images: _images.map((i) => ({
          path: i.path,
          x: i.x,
          y: i.y,
          w: i.w,
          h: i.h,
          rot: i.rot || 0,
        })),
      };
    },

    /* ── Load config from server ── */
    loadConfig(cfg) {
      _fields = [];
      _images = [];
      _undoStack = [];
      _redoStack = [];

      if (cfg.text_fields) {
        cfg.text_fields.forEach((tf) => {
          const r = tf.rect || [100, 100, 400, 140];
          _fields.push({
            id: newId(),
            content: tf.content || '',
            font: tf.font || 'Arial',
            fontSize: tf.font_size || tf.fontSize || 24,
            color: tf.color || '#000000',
            align: tf.align || 'center',
            lineHeight: tf.line_height || tf.lineHeight || 1.2,
            letterSpacing: tf.letter_spacing || tf.letterSpacing || 0,
            autoResize: (tf.auto_resize ?? tf.autoResize) !== false,
            opacity: 100,
            rotation: 0,
            visible: true,
            locked: false,
            x: r[0],
            y: r[1],
            w: r[2] - r[0],
            h: r[3] - r[1],
          });
        });
      }
      if (cfg.images) {
        cfg.images.forEach((im) => {
          _images.push({
            id: newId(),
            path: im.path,
            x: im.x || 0,
            y: im.y || 0,
            w: im.w || 100,
            h: im.h || 100,
            rot: im.rot || 0,
          });
        });
      }
    },

    /* ── Layers helpers ── */
    getAllLayers() {
      /* Returns all elements (text + images) in a single z-ordered array */
      const layers = [];
      _fields.forEach((f) => layers.push({ ...f, type: 'text' }));
      _images.forEach((i) => layers.push({ ...i, type: 'image' }));
      return layers;
    },
    moveLayerUp(id) {
      const fi = _fields.findIndex((f) => f.id === id);
      if (fi > 0) {
        [_fields[fi - 1], _fields[fi]] = [_fields[fi], _fields[fi - 1]];
        _scheduleSave();
        return true;
      }
      const ii = _images.findIndex((i) => i.id === id);
      if (ii > 0) {
        [_images[ii - 1], _images[ii]] = [_images[ii], _images[ii - 1]];
        _scheduleSave();
        return true;
      }
      return false;
    },
    moveLayerDown(id) {
      const fi = _fields.findIndex((f) => f.id === id);
      if (fi >= 0 && fi < _fields.length - 1) {
        [_fields[fi], _fields[fi + 1]] = [_fields[fi + 1], _fields[fi]];
        _scheduleSave();
        return true;
      }
      const ii = _images.findIndex((i) => i.id === id);
      if (ii >= 0 && ii < _images.length - 1) {
        [_images[ii], _images[ii + 1]] = [_images[ii + 1], _images[ii]];
        _scheduleSave();
        return true;
      }
      return false;
    },
    toggleVisibility(id) {
      const el = _fields.find((f) => f.id === id) || _images.find((i) => i.id === id);
      if (el) {
        el.visible = !el.visible;
        _scheduleSave();
      }
    },
    toggleLock(id) {
      const el = _fields.find((f) => f.id === id) || _images.find((i) => i.id === id);
      if (el) {
        el.locked = !el.locked;
        _scheduleSave();
      }
    },

    /* ── localStorage ── */
    saveToLocal: _saveToLocal,
    loadFromLocal: _loadFromLocal,
    savePrefs: _savePrefs,
    loadPrefs: _loadPrefs,
    get hasLocalData() {
      return !!localStorage.getItem(LS_KEY);
    },
    clearLocal() {
      localStorage.removeItem(LS_KEY);
      localStorage.removeItem(LS_STUDENTS_KEY);
    },

    /* ── Reset ── */
    reset() {
      _fields = [];
      _images = [];
      _selectedId = null;
      _undoStack = [];
      _redoStack = [];
    },
  };
})();
