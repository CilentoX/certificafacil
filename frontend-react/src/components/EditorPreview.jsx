import { useState, useEffect } from 'react';
import { Type, MousePointer2, Download, Users, Sparkles } from 'lucide-react';

const STEPS = [
  { label: 'Selecionar template', phase: 'template' },
  { label: 'Posicionar campos de texto', phase: 'fields' },
  { label: 'Importar lista de participantes', phase: 'import' },
  { label: 'Gerar certificados!', phase: 'generate' },
];

const STUDENT_NAMES = ['Ana Carolina Silva', 'Pedro Henrique Santos', 'Maria Fernanda Lima', 'João Victor Oliveira'];

export default function EditorPreview() {
  const [currentStep, setCurrentStep] = useState(0);
  const [showCursor, setShowCursor] = useState(false);
  const [nameIndex, setNameIndex] = useState(0);
  const [generatedCount, setGeneratedCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % STEPS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (STEPS[currentStep].phase === 'fields') {
      setShowCursor(true);
      const t = setTimeout(() => setShowCursor(false), 2000);
      return () => clearTimeout(t);
    }
  }, [currentStep]);

  useEffect(() => {
    if (STEPS[currentStep].phase === 'import') {
      const interval = setInterval(() => {
        setNameIndex(prev => (prev + 1) % STUDENT_NAMES.length);
      }, 800);
      return () => clearInterval(interval);
    }
  }, [currentStep]);

  useEffect(() => {
    if (STEPS[currentStep].phase === 'generate') {
      setGeneratedCount(0);
      const interval = setInterval(() => {
        setGeneratedCount(prev => {
          if (prev >= 4) { clearInterval(interval); return 4; }
          return prev + 1;
        });
      }, 400);
      return () => clearInterval(interval);
    }
  }, [currentStep]);

  const phase = STEPS[currentStep].phase;

  return (
    <div className="editor-preview-wrap">
      {/* Step indicators */}
      <div className="preview-steps">
        {STEPS.map((s, i) => (
          <div key={i} className={`preview-step ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'done' : ''}`}>
            <div className="preview-step-num">{i + 1}</div>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Mock editor */}
      <div className="preview-editor">
        {/* Mock sidebar */}
        <div className="preview-sidebar">
          <div className={`preview-sb-item ${phase === 'template' ? 'active' : ''}`} />
          <div className={`preview-sb-item ${phase === 'fields' ? 'active' : ''}`} />
          <div className={`preview-sb-item ${phase === 'import' ? 'active' : ''}`} />
        </div>

        {/* Mock panel */}
        <div className="preview-panel">
          {phase === 'template' && (
            <div className="preview-panel-content anim-fadeIn">
              <div className="preview-tpl-thumb pulse-border" />
              <div className="preview-line w80" />
              <div className="preview-line w60" />
            </div>
          )}
          {phase === 'fields' && (
            <div className="preview-panel-content anim-fadeIn">
              <div className="preview-field-btn"><Type size={12} /> Nome do Participante</div>
              <div className="preview-field-btn"><Type size={12} /> Curso</div>
              <div className="preview-field-btn"><Type size={12} /> Data</div>
            </div>
          )}
          {phase === 'import' && (
            <div className="preview-panel-content anim-fadeIn">
              <div className="preview-students">
                {STUDENT_NAMES.map((name, i) => (
                  <div key={i} className={`preview-student ${i === nameIndex ? 'highlight' : ''}`}>
                    <Users size={10} /> {name}
                  </div>
                ))}
              </div>
            </div>
          )}
          {phase === 'generate' && (
            <div className="preview-panel-content anim-fadeIn" style={{ textAlign: 'center' }}>
              <Sparkles size={24} className="spin-slow" style={{ color: 'var(--primary)', marginBottom: 8 }} />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {generatedCount}/4 gerados
              </div>
              <div className="preview-progress">
                <div className="preview-progress-bar" style={{ width: `${generatedCount * 25}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Mock canvas */}
        <div className="preview-canvas">
          {/* Certificate mockup */}
          <div className="preview-cert">
            <div className="preview-cert-header">CERTIFICADO</div>
            <div className="preview-cert-sub">DE CONCLUSÃO</div>
            <div className="preview-cert-divider" />

            {(phase === 'fields' || phase === 'import' || phase === 'generate') && (
              <div className={`preview-cert-name ${phase === 'fields' ? 'typing' : ''}`}>
                {phase === 'import' ? STUDENT_NAMES[nameIndex] : 
                 phase === 'generate' ? STUDENT_NAMES[Math.min(generatedCount, 3)] :
                 '{nome}'}
              </div>
            )}

            {(phase === 'fields' || phase === 'import' || phase === 'generate') && (
              <div className="preview-cert-body">
                completou com êxito o curso de<br />
                <strong>Desenvolvimento Web Avançado</strong>
              </div>
            )}

            {phase === 'generate' && generatedCount >= 4 && (
              <div className="preview-cert-badge anim-pop">✓</div>
            )}

            {showCursor && (
              <div className="preview-cursor">
                <MousePointer2 size={16} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
