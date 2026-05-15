import { Layers, Type, ImageIcon, QrCode, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import useEditorStore from '../../../stores/editorStore';

export default function LayersPanel() {
  const fields = useEditorStore(s => s.fields);
  const selectedFieldId = useEditorStore(s => s.selectedFieldId);
  const selectField = useEditorStore(s => s.selectField);
  const reorderField = useEditorStore(s => s.reorderField);
  const removeField = useEditorStore(s => s.removeField);

  return (
    <div className="layers-container">
      {fields.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-dim)' }}>
          <Layers size={32} style={{ opacity: 0.1, marginBottom: '16px' }} />
          <p style={{ fontSize: '0.85rem' }}>Nenhuma camada ativa.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div className="panel-section-label" style={{ fontSize: '0.65rem', marginBottom: '4px', opacity: 0.5 }}>ORDEM DE SOBREPOSIÇÃO</div>
          {[...fields].reverse().map((f) => (
            <div key={f.id} className={`layer-item ${selectedFieldId === f.id ? 'selected' : ''}`}
              onClick={() => selectField(f.id)}>
              <div className="layer-type-icon">
                {f.type === 'image' ? <ImageIcon size={12} /> : f.type === 'qrcode' ? <QrCode size={12} /> : <Type size={12} />}
              </div>
              <span className="layer-name">{f.content?.slice(0, 26) || (f.type === 'image' ? 'Imagem' : 'Campo')}</span>
              <div className="layer-actions">
                <button onClick={e => { e.stopPropagation(); reorderField(f.id, 'up'); }} title="Trazer para frente"><ChevronUp size={12} /></button>
                <button onClick={e => { e.stopPropagation(); reorderField(f.id, 'down'); }} title="Enviar para trás"><ChevronDown size={12} /></button>
                <button onClick={e => { e.stopPropagation(); removeField(f.id); }} title="Excluir" style={{ color: 'var(--danger)' }}><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
