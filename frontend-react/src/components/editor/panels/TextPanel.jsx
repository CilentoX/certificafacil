import { UploadCloud, Loader2, Trash2, Plus, Type } from 'lucide-react';
import useEditorStore from '../../../stores/editorStore';

const PRESETS = [
  { label: 'Nome do Participante', content: '{nome}', fontSize: 32, color: '#1a1a2e', align: 'center' },
  { label: 'Nome do Curso', content: '{curso}', fontSize: 22, color: '#333355', align: 'center' },
  { label: 'Data de Conclusão', content: '{data}', fontSize: 16, color: '#555555', align: 'center' },
  { label: 'Carga Horária', content: '{carga_horaria} horas', fontSize: 14, color: '#555555', align: 'center' },
  { label: 'Parágrafo', content: 'Certificamos que {nome} concluiu com êxito o curso de {curso}.', fontSize: 14, color: '#444444', align: 'center' },
];

export default function TextPanel({ 
  fontInputRef, fontLoading, handleFontUpload, fonts, deleteFont, setActivePanel 
}) {
  const addField = useEditorStore(s => s.addField);
  const canvasSize = useEditorStore(s => s.canvasSize);
  const w = typeof canvasSize?.w === 'object' ? canvasSize.w.w : (canvasSize?.w || 841);
  const h = typeof canvasSize?.w === 'object' ? canvasSize.w.h : (canvasSize?.h || 595);

  const addBlankField = () => {
    addField({
      type: 'text', content: 'Novo texto',
      posX: 150, posY: 200,
      fontSize: 24, color: '#1a1a2e', align: 'center',
      fontFamily: 'Inter', lineHeight: 1.4, letterSpacing: 0,
      opacity: 100, rotation: 0, width: 300, height: 40
    });
  };

  const addPreset = (preset) => {
    addField({
      type: 'text', content: preset.content,
      posX: Math.round(w / 2 - 200), posY: Math.round(h / 2),
      fontSize: preset.fontSize, color: preset.color, align: preset.align,
      fontFamily: 'Inter', lineHeight: 1.4, letterSpacing: 0,
      opacity: 100, rotation: 0, width: 400, height: 50,
    });
    setActivePanel('layers');
  };

  return (
    <>
      <div className="panel-section">
        <div className="panel-section-title">Instalar Fonte (.ttf / .otf)</div>
        <button className="btn btn-glass w-full btn-sm" onClick={() => fontInputRef.current?.click()} disabled={fontLoading}>
          {fontLoading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />} 
          Gerenciar Fontes
        </button>
        <input ref={fontInputRef} type="file" accept=".ttf,.otf" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFontUpload(f); e.target.value = ''; }} />
        
        {fonts.length > 0 && (
          <div className="font-list-mini" style={{ marginTop: '14px' }}>
            <div className="panel-section-label" style={{ marginBottom: '8px', fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 600 }}>FONTES INSTALADAS</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {fonts.map(f => (
                <div key={f} className="badge-font" style={{ 
                  background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', 
                  padding: '4px 10px', borderRadius: '6px', fontSize: '0.65rem',
                  display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)'
                }}>
                  <span style={{ fontFamily: `"${f.split('.')[0]}"`, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.split('.')[0]}</span>
                  <button onClick={() => deleteFont(f)} style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0, opacity: 0.7 }}>
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="panel-section" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
        <button className="btn btn-premium w-full" style={{ height: '44px' }} onClick={addBlankField}>
          <Plus size={18} /> Novo Campo de Texto
        </button>
      </div>

      <div className="panel-section">
        <div className="panel-section-title">Modelos Rápidos</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PRESETS.map((p, i) => (
            <button key={i} className="btn btn-glass w-full" 
              style={{ justifyContent: 'space-between', padding: '12px 14px', height: 'auto', textAlign: 'left' }}
              onClick={() => addPreset(p)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Type size={16} style={{ opacity: 0.6 }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{p.label}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{p.content.includes('{') ? 'Dinâmico' : 'Estático'}</span>
                </div>
              </div>
              <Plus size={12} style={{ opacity: 0.4 }} />
            </button>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-section-title">Variáveis Inteligentes</div>
        <div className="var-list" style={{ gap: '8px' }}>
          {['{nome}', '{curso}', '{data}', '{carga_horaria}', '{instituicao}'].map(v => (
            <div key={v} className="var-tag" onClick={() => addField({ content: v, fontSize: 24, align: 'center' })}>
              {v}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
