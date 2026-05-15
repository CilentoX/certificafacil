import { UploadCloud, Loader2, ImageIcon, Plus, Trash2, QrCode } from 'lucide-react';
import useEditorStore from '../../../stores/editorStore';

export default function ImagesPanel({ 
  assetInputRef, assetLoading, handleAssetUpload, assets, deleteAsset 
}) {
  const addField = useEditorStore(s => s.addField);
  const canvasSize = useEditorStore(s => s.canvasSize);
  const w = typeof canvasSize?.w === 'object' ? canvasSize.w.w : (canvasSize?.w || 841);
  const h = typeof canvasSize?.w === 'object' ? canvasSize.w.h : (canvasSize?.h || 595);

  const addImageField = (asset) => {
    addField({
      type: 'image',
      content: asset.filename,
      imageUrl: asset.url,
      posX: Math.round(w / 2 - 50),
      posY: Math.round(h / 2 - 50),
      width: 100,
      height: 100,
      opacity: 100,
      rotation: 0
    });
  };

  const addQrCodeField = () => {
    addField({
      type: 'qrcode',
      content: '{qrcode}', 
      posX: Math.round(w - 120),
      posY: Math.round(h - 120),
      width: 80,
      height: 80,
      opacity: 100,
      rotation: 0
    });
  };

  return (
    <>
      <div className="panel-section">
        <div className="panel-section-title">Biblioteca de Ativos</div>
        <button className="btn btn-premium w-full" onClick={() => assetInputRef.current?.click()} disabled={assetLoading}>
          {assetLoading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />} 
          Carregar Nova Imagem
        </button>
        <input ref={assetInputRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAssetUpload(f); e.target.value = ''; }} />
      </div>
      
      <div className="panel-section">
        <div className="panel-section-title" style={{ justifyContent: 'space-between' }}>
          SEUS ARQUIVOS 
          <span style={{ fontSize: '0.6rem', color: 'var(--primary-hover)', opacity: 0.8 }}>{assets.length} Itens</span>
        </div>
        
        {assets.length === 0 ? (
          <div className="empty-panel-box">
            <ImageIcon size={28} style={{ opacity: 0.1, marginBottom: '8px' }} />
            <p>Sua galeria está vazia.</p>
          </div>
        ) : (
          <div className="asset-grid">
            {assets.map((asset, i) => (
              <div key={i} className="asset-card-mini" onClick={() => { addImageField(asset); }}>
                <div className="asset-thumb-wrap">
                  <img src={asset.url} alt={asset.filename} />
                </div>
                <div className="asset-overlay">
                  <Plus size={14} color="white" />
                </div>
                <button 
                  className="asset-delete-btn" 
                  onClick={(e) => { e.stopPropagation(); deleteAsset(asset.filename); }}
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel-section" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
        <div className="panel-section-title">Componentes de Validação</div>
        <button className="btn btn-glass w-full" onClick={() => { addQrCodeField(); }}>
          <QrCode size={16} color="var(--primary-hover)" /> 
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginLeft: '4px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Gerar QR Code</span>
            <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>Segurança e Autenticidade</span>
          </div>
        </button>
        <div className="info-box-mini">
          <p>O QR Code vincula este certificado a um registro único em nossa blockchain de validação.</p>
        </div>
      </div>
    </>
  );
}
