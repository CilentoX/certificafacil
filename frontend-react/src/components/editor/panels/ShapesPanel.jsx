import { Square, Minus, Circle, Frame, Plus } from 'lucide-react';
import useEditorStore from '../../../stores/editorStore';

const PRESETS = [
  { label: 'Quadrado / Retângulo', icon: Square, shapeType: 'rect', width: 200, height: 200, bg: '#6366f1', border: '#ffffff', bw: 0 },
  { label: 'Moldura (Vazada)', icon: Frame, shapeType: 'rect', width: 400, height: 300, bg: 'transparent', border: '#cbd5e1', bw: 4 },
  { label: 'Círculo', icon: Circle, shapeType: 'circle', width: 150, height: 150, bg: '#ec4899', border: '#ffffff', bw: 0 },
  { label: 'Linha Horizontal', icon: Minus, shapeType: 'line', width: 300, height: 4, bg: '#94a3b8', border: 'transparent', bw: 0 },
  { label: 'Linha Vertical', icon: Minus, shapeType: 'line', width: 4, height: 300, bg: '#94a3b8', border: 'transparent', bw: 0 },
];

export default function ShapesPanel({ setActivePanel }) {
  const addField = useEditorStore(s => s.addField);
  const canvasSize = useEditorStore(s => s.canvasSize);
  const w = typeof canvasSize?.w === 'object' ? canvasSize.w.w : (canvasSize?.w || 841);
  const h = typeof canvasSize?.w === 'object' ? canvasSize.w.h : (canvasSize?.h || 595);

  const addShape = (preset) => {
    addField({
      type: 'shape',
      shapeType: preset.shapeType,
      posX: Math.round(w / 2 - preset.width / 2),
      posY: Math.round(h / 2 - preset.height / 2),
      width: preset.width,
      height: preset.height,
      backgroundColor: preset.bg,
      borderColor: preset.border,
      borderWidth: preset.bw,
      borderRadius: preset.shapeType === 'circle' ? '50%' : 0,
      opacity: 100,
      rotation: 0
    });
    setActivePanel('layers');
  };

  return (
    <>
      <div className="panel-section">
        <div className="panel-section-title">Formas Geométricas</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PRESETS.map((p, i) => {
            const Icon = p.icon;
            return (
              <button key={i} className="btn btn-glass w-full" 
                style={{ justifyContent: 'space-between', padding: '12px 14px', height: 'auto', textAlign: 'left' }}
                onClick={() => addShape(p)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon size={18} style={{ opacity: 0.8 }} />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{p.label}</span>
                  </div>
                </div>
                <Plus size={14} style={{ opacity: 0.4 }} />
              </button>
            )
          })}
        </div>
      </div>
    </>
  );
}
