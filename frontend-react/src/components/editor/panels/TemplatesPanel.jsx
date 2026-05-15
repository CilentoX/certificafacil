import { UploadCloud } from 'lucide-react';
import useEditorStore from '../../../stores/editorStore';

export default function TemplatesPanel({ fileInputRef, pdfLoading, handlePdfUpload }) {
  const templateImage = useEditorStore(s => s.templateImage);
  const canvasSize = useEditorStore(s => s.canvasSize);

  // Safe destructure
  const w = typeof canvasSize?.w === 'object' ? canvasSize.w.w : (canvasSize?.w || 841);
  const h = typeof canvasSize?.w === 'object' ? canvasSize.w.h : (canvasSize?.h || 595);

  return (
    <div className="panel-content-wrap">
      <div className="panel-intro-text">
        Comece enviando o modelo base do seu certificado em formato PDF.
      </div>
      <div className={`drop-zone ${pdfLoading ? 'loading' : ''}`}
        onClick={() => !pdfLoading && fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
        onDragLeave={e => e.currentTarget.classList.remove('dragover')}
        onDrop={e => {
          e.preventDefault();
          e.currentTarget.classList.remove('dragover');
          const file = e.dataTransfer.files?.[0];
          if (file) handlePdfUpload(file);
        }}>
        {pdfLoading ? (
          <div className="loading-container">
            <div className="spinner-glow" />
            <span>Renderizando...</span>
          </div>
        ) : (
          <>
            <div className="drop-zone-icon-wrap">
              <UploadCloud size={32} />
            </div>
            <div className="drop-zone-text">
              <span>Clique ou arraste um PDF</span>
              <p>Os campos serão sobrepostos à primeira página</p>
            </div>
          </>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdfUpload(f); e.target.value = ''; }} />
      
      {templateImage && (
        <div className="panel-section active-template-section">
          <div className="panel-section-title">Template Atual</div>
          <div className="template-current-card">
            <div className="template-thumb-info">
              <img src={templateImage} alt="template" className="template-thumb" />
              <div className="template-badge-size">{w} × {h} px</div>
            </div>
            <div className="template-card-footer">
              <button className="btn btn-xs btn-ghost" onClick={() => fileInputRef.current?.click()}>
                Substituir PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
