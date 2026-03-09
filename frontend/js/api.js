/* ===== API WRAPPER ===== */
const API = (() => {
  const BASE = '';

  async function _fetch(url, opts = {}) {
    try {
      const r = await fetch(BASE + url, opts);
      if (!r.ok) {
        const e = await r.json().catch(() => ({ error: r.statusText }));
        throw new Error(e.error || r.statusText);
      }
      return r;
    } catch (err) {
      console.error('[API]', url, err);
      throw err;
    }
  }

  async function _json(url, opts) {
    return (await _fetch(url, opts)).json();
  }

  return {
    /* ── Status ── */
    async ping() {
      try {
        await _fetch('/api/templates');
        return true;
      } catch {
        return false;
      }
    },

    /* ── Templates ── */
    async listTemplates() {
      const d = await _json('/api/templates');
      return d.templates || [];
    },
    async uploadTemplate(file) {
      const fd = new FormData();
      fd.append('file', file);
      return _json('/api/upload-template', { method: 'POST', body: fd });
    },

    /* ── Fonts ── */
    async listFonts() {
      const d = await _json('/api/fonts');
      return d.fonts || [];
    },
    async uploadFont(file) {
      const fd = new FormData();
      fd.append('file', file);
      return _json('/api/upload-font', { method: 'POST', body: fd });
    },

    /* ── Images ── */
    async listImages() {
      const d = await _json('/api/images');
      return d.images || [];
    },
    async uploadImage(file) {
      const fd = new FormData();
      fd.append('file', file);
      return _json('/api/upload-image', { method: 'POST', body: fd });
    },
    async deleteImage(name) {
      return _json('/api/delete-image/' + encodeURIComponent(name), { method: 'DELETE' });
    },

    /* ── Config ── */
    async saveConfig(templateName, config) {
      return _json('/api/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_name: templateName, config }),
      });
    },
    async loadConfig(templateName) {
      return _json('/api/load-config?template_name=' + encodeURIComponent(templateName));
    },

    /* ── Generate ── */
    async generate(templateName, config, studentData = {}) {
      return _json('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_name: templateName,
          config,
          name: studentData.nome || studentData.aluno || studentData.name || 'Nome',
          course: studentData.curso || studentData.course || '',
          variables: studentData,
        }),
      });
    },

    /* ── Batch ── */
    async generateBatch(templateName, config, items) {
      return _json('/api/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_name: templateName, config, items, combine_pdf: true }),
      });
    },
  };
})();
