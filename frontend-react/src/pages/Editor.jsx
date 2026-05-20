import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LayoutTemplate, Layers, Type, Image as ImageIcon, Users, ChevronLeft, ChevronRight, Square } from 'lucide-react';
import Papa from 'papaparse';

import useEditorStore from '../stores/editorStore';
import useAuthStore from '../stores/authStore';
import { useToast } from '../components/ToastContainer';
import { pdfToImage } from '../utils/pdfToImage';
import Api from '../services/api';

import BatchModal from '../components/BatchModal';
import EditorTopbar from '../components/editor/EditorTopbar';
import EditorSidebar from '../components/editor/EditorSidebar';
import EditorWorkspace from '../components/editor/EditorWorkspace';
import PropertiesPanel from '../components/editor/PropertiesPanel';

// Panels
import TemplatesPanel from '../components/editor/panels/TemplatesPanel';
import TextPanel from '../components/editor/panels/TextPanel';
import LayersPanel from '../components/editor/panels/LayersPanel';
import StudentsPanel from '../components/editor/panels/StudentsPanel';
import ImagesPanel from '../components/editor/panels/ImagesPanel';
import ShapesPanel from '../components/editor/panels/ShapesPanel';

const NAV = [
  { id: 'templates', icon: LayoutTemplate, label: 'Templates' },
  { id: 'text', icon: Type, label: 'Texto' },
  { id: 'shapes', icon: Square, label: 'Formas' },
  { id: 'layers', icon: Layers, label: 'Camadas' },
  { id: 'students', icon: Users, label: 'Participantes' },
  { id: 'images', icon: ImageIcon, label: 'Imagens' },
];

export default function Editor() {
  const navigate = useNavigate();
  const { uid } = useParams();
  const toast = useToast();
  const { initialize } = useAuthStore();

  const [activePanel, setActivePanel] = useState('templates');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [viewRealData, setViewRealData] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [fonts, setFonts] = useState([]);
  const [fontLoading, setFontLoading] = useState(false);
  const [assets, setAssets] = useState([]);
  const [assetLoading, setAssetLoading] = useState(false);
  const [showVarHelper, setShowVarHelper] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef(null);
  const csvInputRef = useRef(null);
  const assetInputRef = useRef(null);
  const fontInputRef = useRef(null);

  const fields = useEditorStore(s => s.fields);
  const students = useEditorStore(s => s.students);
  const currentStudentIndex = useEditorStore(s => s.currentStudentIndex);
  const setStudents = useEditorStore(s => s.setStudents);
  const projectId = useEditorStore(s => s.projectId);
  const projectName = useEditorStore(s => s.projectName);
  const setProjectName = useEditorStore(s => s.setProjectName);
  const setTemplate = useEditorStore(s => s.setTemplate);
  const setCanvasSize = useEditorStore(s => s.setCanvasSize);
  const prevStudent = useEditorStore(s => s.prevStudent);
  const nextStudent = useEditorStore(s => s.nextStudent);
  const updateField = useEditorStore(s => s.updateField);
  const selectedFieldId = useEditorStore(s => s.selectedFieldId);
  const canvasSize = useEditorStore(s => s.canvasSize);

  // Safe canvas sizes
  const w = typeof canvasSize?.w === 'object' ? canvasSize.w.w : (canvasSize?.w || 841);
  const h = typeof canvasSize?.w === 'object' ? canvasSize.w.h : (canvasSize?.h || 595);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Load project logic
  useEffect(() => {
    if (uid && projectId !== uid) {
      const load = async () => {
        try {
          const project = await Api.getProject(uid);
          setProjectName(project.name);
          useEditorStore.setState({ projectId: project.uid });
          if (project.configJson) useEditorStore.setState({ fields: project.configJson });
          
          if (project.templateName) {
            setPdfLoading(true);
            try {
              const blob = await Api.downloadTemplateBlob(project.templateName);
              const { dataUrl, width, height } = await pdfToImage(blob, 2);
              useEditorStore.getState().setTemplate(project.templateName, dataUrl);
              setCanvasSize({ w: width, h: height });
            } catch (err) {
              console.error('Erro ao renderizar template PDF:', err);
              toast.error('Erro ao carregar pré-visualização do template.');
            } finally {
              setPdfLoading(false);
            }
          }
        } catch (err) {
          toast.error('Erro ao carregar projeto: ' + err.message);
          navigate('/dashboard');
        }
      };
      load();
    } else if (!uid && projectId) {
      useEditorStore.setState({ fields: [], projectId: null, projectName: 'Projeto Sem Título', template: null, templateImage: null });
    }
  }, [uid, navigate]);

  // Assets and Fonts loaders
  const loadAssets = async () => {
    try {
      const res = await Api.getAssets();
      if (res.ok) setAssets(res.assets);
    } catch (err) { console.error('Erro ao carregar imagens:', err); }
  };

  const loadFonts = async () => {
    try {
      const res = await Api.getFonts();
      setFonts(res.fonts || []);
    } catch (err) { console.error('Erro ao carregar fontes:', err); }
  };

  const lastSavedRef = useRef({ fieldsStr: '', projectName: '' });

  // Auto-Save Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentFields = useEditorStore.getState().fields;
      const currentTemplate = useEditorStore.getState().template;
      const currentProjectId = useEditorStore.getState().projectId;
      
      // Don't auto-save if there's no content to save
      if (!currentTemplate && currentFields.length === 0) return;

      const fieldsStr = JSON.stringify(currentFields);
      if (lastSavedRef.current.fieldsStr === fieldsStr && lastSavedRef.current.projectName === projectName) {
        return; // No changes to save
      }

      const autoSave = async () => {
        try {
          setSaving(true);
          const res = await Api.saveProject({
            uid: currentProjectId,
            name: projectName,
            templateName: currentTemplate,
            configJson: currentFields
          });
          
          lastSavedRef.current = { fieldsStr, projectName };
          
          // If it was a new project, store the returned uid
          if (!currentProjectId && res.uid) {
            useEditorStore.setState({ projectId: res.uid });
            navigate(`/editor/${res.uid}`, { replace: true });
          }
        } catch (err) {
          console.error('Erro no Auto-Save', err);
        } finally {
          setSaving(false);
        }
      };

      autoSave();
    }, 2000);

    return () => clearTimeout(timer);
  }, [fields, projectName, navigate]);


  useEffect(() => {
    if (activePanel === 'images') loadAssets();
    if (activePanel === 'text') loadFonts();
  }, [activePanel]);

  useEffect(() => {
    const styleId = 'custom-fonts-style';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const baseUrl = API_URL.replace('/api', '');

    const fontRules = fonts.map(f => {
      const family = f.split('.')[0];
      return `
        @font-face {
          font-family: "${family}";
          src: url("${baseUrl}/assets/fonts/${f}");
        }
      `;
    }).join('\n');
    styleEl.innerHTML = fontRules;
  }, [fonts]);

  // Handlers
  const handlePdfUpload = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Selecione um arquivo PDF válido.');
      return;
    }
    setPdfLoading(true);
    try {
      const { dataUrl, width, height } = await pdfToImage(file, 2);
      const res = await Api.uploadTemplate(file);
      if (res.ok) {
        setTemplate(res.filename, dataUrl);
        setCanvasSize({ w: width, h: height });
        toast.success(`Template "${file.name}" sincronizado!`);
        setActivePanel('text');
      } else {
        throw new Error('Falha no upload do servidor');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao renderizar o PDF.');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleAssetUpload = async (file) => {
    if (!file) return;
    setAssetLoading(true);
    try {
      const res = await Api.uploadAsset(file);
      if (res.ok) {
        toast.success('Imagem enviada!');
        loadAssets();
      }
    } catch (err) {
      toast.error('Erro no upload: ' + err.message);
    } finally { setAssetLoading(false); }
  };

  const deleteAsset = async (filename) => {
    if (!window.confirm('Excluir esta imagem permanentemente?')) return;
    try {
      await Api.deleteAsset(filename);
      toast.success('Imagem excluída');
      loadAssets();
    } catch (err) { toast.error('Erro ao excluir: ' + err.message); }
  };

  const handleFontUpload = async (file) => {
    if (!file) return;
    setFontLoading(true);
    try {
      await Api.uploadFont(file);
      toast.success('Fonte instalada com sucesso!');
      loadFonts();
    } catch (err) {
      toast.error(err.message);
    } finally { setFontLoading(false); }
  };

  const deleteFont = async (filename) => {
    if(!window.confirm('Excluir esta fonte?')) return;
    try {
      await Api.deleteFont(filename);
      toast.success('Fonte removida');
      loadFonts();
    } catch (err) { toast.error(err.message); }
  };

  const handleCsvUpload = (file) => {
    if (!file) return;
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (results) => {
        let mappedNome = null, mappedEmail = null, mappedZap = null;
        const parsed = results.data.map(row => {
          const normalized = {};
          for (let key in row) {
            const rawKey = key;
            key = key.replace(/^\ufeff/, '').trim();
            const lowKey = key.toLowerCase();
            const val = String(row[rawKey] || '').trim();
            
            if (lowKey.includes('nome') || lowKey === 'name' || lowKey === 'aluno' || lowKey.includes('completo') || lowKey.includes('participante')) {
                normalized.nome = val;
                if(!mappedNome) mappedNome = key;
            } else if (lowKey.includes('email') || lowKey === 'mail' || lowKey.includes('contato')) {
                normalized.email = val;
                if(!mappedEmail) mappedEmail = key;
            } else if (lowKey.includes('zap') || lowKey.includes('whatsapp') || lowKey.includes('tel') || lowKey === 'phone' || lowKey === 'telefone') {
                normalized.whatsapp = val;
                if(!mappedZap) mappedZap = key;
            } else if (lowKey.includes('cpf') || lowKey.includes('document')) {
                normalized.cpf = val;
            } else if (lowKey.includes('rg') || lowKey.includes('identidade')) {
                normalized.rg = val;
            } else if (lowKey.includes('curso') || lowKey.includes('course')) {
                normalized.curso = val;
            } else if (lowKey.includes('data') || lowKey.includes('date')) {
                normalized.data = val;
            } else if (lowKey.includes('carga') || lowKey.includes('horas') || lowKey.includes('hours')) {
                normalized.carga_horaria = val;
            } else {
              normalized[key.toLowerCase()] = val;
              if (key !== key.toLowerCase()) normalized[key] = val;
            }
          }
          return normalized;
        });

        if (parsed.length > 0) {
          setStudents(parsed);
          let mappingMsg = [];
          if(mappedNome) mappingMsg.push(`Nome (${mappedNome})`);
          if(mappedEmail) mappingMsg.push(`E-mail (${mappedEmail})`);
          if(mappedZap) mappingMsg.push(`WhatsApp (${mappedZap})`);
          toast.success(`${parsed.length} participantes! ${mappingMsg.length > 0 ? 'Mapeado: ' + mappingMsg.join(', ') : ''}`);
          setActivePanel('students');
        } else {
          toast.error('Nenhum dado válido encontrado no arquivo.');
        }
      },
      error: (err) => { console.error(err); toast.error('Erro ao processar o CSV.'); }
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const data = {
        uid: projectId,
        name: projectName,
        templateName: useEditorStore.getState().template,
        configJson: useEditorStore.getState().fields
      };
      const res = await Api.saveProject(data);
      if (!projectId) {
        useEditorStore.setState({ projectId: res.uid });
        navigate(`/editor/${res.uid}`, { replace: true });
      }
      toast.success('Projeto salvo com sucesso!');
    } catch (err) {
      toast.error('Erro ao salvar projeto: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const resolveContent = (content) => {
    if (!content) return '';
    if (!viewRealData || students.length === 0) return content;
    const rawStudent = students[currentStudentIndex];
    if (!rawStudent) return content;
    let result = String(content);
    
    if (typeof rawStudent === 'string') {
      result = result.replace(/{nome}/gi, rawStudent);
    } else {
      const dataMap = { ...rawStudent };
      const vars = result.match(/\{[^{}]+\}/g) || [];
      vars.forEach(v => {
        const key = v.slice(1, -1).toLowerCase().trim();
        const value = dataMap[key] || '';
        result = result.replace(new RegExp(v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), value);
      });
    }
    return result;
  };

  const insertVar = (variable) => {
    if (!selectedFieldId) return;
    const selectedField = fields.find(f => f.id === selectedFieldId);
    if (!selectedField) return;
    const newContent = selectedField.content + `{${variable}}`;
    updateField(selectedField.id, { content: newContent });
  };

  return (
    <div className="editor-layout">
      <EditorTopbar 
        viewRealData={viewRealData} setViewRealData={setViewRealData}
        showGrid={showGrid} setShowGrid={setShowGrid}
        snapToGrid={snapToGrid} setSnapToGrid={setSnapToGrid}
        showShortcuts={showShortcuts} setShowShortcuts={setShowShortcuts}
        handleSave={handleSave} saving={saving}
        setShowBatchModal={setShowBatchModal}
      />

      {showShortcuts && (
        <div className="shortcuts-overlay" onClick={() => setShowShortcuts(false)}>
          <div className="shortcuts-modal" onClick={e => e.stopPropagation()}>
            <h3>⌨️ Atalhos do Teclado</h3>
            <div className="shortcut-row"><kbd>Ctrl+Z</kbd><span>Desfazer</span></div>
            <div className="shortcut-row"><kbd>Ctrl+Y</kbd><span>Refazer</span></div>
            <div className="shortcut-row"><kbd>Ctrl+D</kbd><span>Duplicar campo</span></div>
            <div className="shortcut-row"><kbd>Ctrl+S</kbd><span>Salvar projeto</span></div>
            <div className="shortcut-row"><kbd>Delete</kbd><span>Excluir campo</span></div>
            <div className="shortcut-row"><kbd>Escape</kbd><span>Desselecionar</span></div>
            <div className="shortcut-row"><kbd>↑ ↓ ← →</kbd><span>Mover 1px</span></div>
            <div className="shortcut-row"><kbd>Shift + Setas</kbd><span>Mover 10px</span></div>
            <div className="shortcut-row"><kbd>Ctrl + Scroll</kbd><span>Zoom</span></div>
            <div className="shortcut-row"><kbd>Duplo clique</kbd><span>Editar texto inline</span></div>
          </div>
        </div>
      )}

      <div className="editor-main">
        <div className="editor-body">
          <EditorSidebar activePanel={activePanel} setActivePanel={setActivePanel} NAV={NAV} />

          <aside className="editor-panel">
            <div className="panel-head">
              <h3>{NAV.find(n => n.id === activePanel)?.label}</h3>
              {activePanel === 'layers' && <span className="badge badge-primary">{fields.length}</span>}
            </div>
            <div className="panel-body">
              {activePanel === 'templates' && (
                <TemplatesPanel fileInputRef={fileInputRef} pdfLoading={pdfLoading} handlePdfUpload={handlePdfUpload} />
              )}
              {activePanel === 'text' && (
                <TextPanel fontInputRef={fontInputRef} fontLoading={fontLoading} handleFontUpload={handleFontUpload} fonts={fonts} deleteFont={deleteFont} setActivePanel={setActivePanel} />
              )}
              {activePanel === 'shapes' && (
                <ShapesPanel setActivePanel={setActivePanel} />
              )}
              {activePanel === 'layers' && (
                <LayersPanel />
              )}
              {activePanel === 'students' && (
                <StudentsPanel csvInputRef={csvInputRef} handleCsvUpload={handleCsvUpload} studentSearch={studentSearch} setStudentSearch={setStudentSearch} />
              )}
              {activePanel === 'images' && (
                <ImagesPanel assetInputRef={assetInputRef} assetLoading={assetLoading} handleAssetUpload={handleAssetUpload} assets={assets} deleteAsset={deleteAsset} />
              )}
            </div>
          </aside>

          <EditorWorkspace
            fileInputRef={fileInputRef}
            setActivePanel={setActivePanel}
            showGrid={showGrid}
            snapToGrid={snapToGrid}
            resolveContent={resolveContent}
            editingFieldId={editingFieldId}
            setEditingFieldId={setEditingFieldId}
            handleSave={handleSave}
          />

          <PropertiesPanel 
            showVarHelper={showVarHelper} 
            setShowVarHelper={setShowVarHelper} 
            insertVar={insertVar} 
            fonts={fonts} 
          />
        </div>

        <div className="editor-bottombar">
          <div className="bb-group">
            <span className="bb-info">{fields.length} campo(s)</span>
          </div>
          <div className="bb-group">
            <button className="btn btn-icon btn-ghost btn-sm" onClick={prevStudent}><ChevronLeft size={14} /></button>
            <span className="bb-info">Participante {students.length > 0 ? currentStudentIndex + 1 : 0} de {students.length}</span>
            <button className="btn btn-icon btn-ghost btn-sm" onClick={nextStudent}><ChevronRight size={14} /></button>
          </div>
          <div className="bb-group">
            <span className="bb-info">{w} × {h} px</span>
          </div>
        </div>
      </div>

      <BatchModal isOpen={showBatchModal} onClose={() => setShowBatchModal(false)} />
    </div>
  );
}
