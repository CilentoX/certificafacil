import { 
  Type, ImageIcon, QrCode, AlignLeft, AlignCenter, AlignRight, Trash2, Square, Bold, Italic
} from 'lucide-react';
import useEditorStore from '../../stores/editorStore';

export default function PropertiesPanel({ showVarHelper, setShowVarHelper, insertVar, fonts }) {
  const fields = useEditorStore(s => s.fields);
  const selectedFieldId = useEditorStore(s => s.selectedFieldId);
  const updateField = useEditorStore(s => s.updateField);
  const deselectField = useEditorStore(s => s.deselectField);
  const removeField = useEditorStore(s => s.removeField);
  const commitField = useEditorStore(s => s.commitField);

  const selectedField = fields.find(f => f.id === selectedFieldId);

  if (!selectedField) return null;

  return (
    <div className="props-panel">
      <div className="props-header">
        <div className="props-title-group">
          <div className="props-icon">
            {selectedField.type === 'image' ? <ImageIcon size={14} /> : selectedField.type === 'shape' ? <Square size={14} /> : selectedField.type === 'qrcode' ? <QrCode size={14} /> : <Type size={14} />}
          </div>
          <h4>{selectedField.type === 'image' ? 'Imagem' : selectedField.type === 'shape' ? 'Forma' : selectedField.type === 'qrcode' ? 'QR Code' : 'Texto'}</h4>
        </div>
        <button className="btn btn-icon btn-sm btn-ghost" onClick={deselectField}>✕</button>
      </div>
      
      <div className="props-body">
        {selectedField.type === 'image' ? (
          <div className="props-group">
            <label>Arquivo</label>
            <div className="props-file-info">{selectedField.content}</div>
          </div>
        ) : (
          <div className="props-group">
            <div className="props-label-row">
              <label>Conteúdo</label>
              <div className="var-helper-context">
                <button 
                  className="btn btn-xs btn-ghost" 
                  onClick={() => setShowVarHelper(!showVarHelper)}
                >
                  {'{ }'} Variável
                </button>
                {showVarHelper && (
                  <div className="var-helper-dropdown">
                    {['nome', 'curso', 'data', 'carga_horaria', 'cpf', 'rg', 'vlink'].map(v => (
                      <div key={v} className="var-item" onClick={() => { insertVar(v); setShowVarHelper(false); }}>
                        {`{${v}}`}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <textarea 
              className="input props-textarea" 
              value={selectedField.content}
              onChange={e => updateField(selectedField.id, { content: e.target.value })}
              onBlur={commitField}
              rows={2}
            />
          </div>
        )}

        <div className="props-divider">ESTILO</div>

        {selectedField.type === 'shape' && (
          <>
            <div className="props-grid-2">
              <div className="props-group">
                <label>Fundo (Preenchimento)</label>
                <div className="color-picker-wrap">
                  <input type="color" value={selectedField.backgroundColor === 'transparent' ? '#ffffff' : selectedField.backgroundColor}
                    onChange={e => updateField(selectedField.id, { backgroundColor: e.target.value })}
                    onBlur={commitField}
                    className="color-input" />
                  <span className="color-hex">{selectedField.backgroundColor === 'transparent' ? 'Nenhum' : selectedField.backgroundColor}</span>
                </div>
                <button 
                  className="btn btn-xs btn-ghost mt-2 w-full"
                  onClick={() => { updateField(selectedField.id, { backgroundColor: 'transparent' }); commitField(); }}
                >
                  Sem Fundo
                </button>
              </div>
              <div className="props-group">
                <label>Cor da Borda</label>
                <div className="color-picker-wrap">
                  <input type="color" value={selectedField.borderColor === 'transparent' ? '#ffffff' : selectedField.borderColor}
                    onChange={e => updateField(selectedField.id, { borderColor: e.target.value })}
                    onBlur={commitField}
                    className="color-input" />
                  <span className="color-hex">{selectedField.borderColor === 'transparent' ? 'Nenhuma' : selectedField.borderColor}</span>
                </div>
                <button 
                  className="btn btn-xs btn-ghost mt-2 w-full"
                  onClick={() => { updateField(selectedField.id, { borderColor: 'transparent' }); commitField(); }}
                >
                  Sem Borda
                </button>
              </div>
            </div>

            <div className="props-grid-2 mt-4">
              <div className="props-group">
                <label>Espessura Borda</label>
                <div className="input-with-suffix">
                  <input className="input" type="number" min={0} max={50} value={selectedField.borderWidth || 0}
                    onChange={e => updateField(selectedField.id, { borderWidth: parseInt(e.target.value) || 0 })}
                    onBlur={commitField} />
                  <span className="suffix">px</span>
                </div>
              </div>
              <div className="props-group">
                <label>Arredondamento</label>
                <div className="input-with-suffix">
                  <input className="input" type="number" min={0} max={200} value={selectedField.borderRadius === '50%' ? 100 : (selectedField.borderRadius || 0)}
                    onChange={e => updateField(selectedField.id, { borderRadius: parseInt(e.target.value) || 0, shapeType: 'rect' })}
                    onBlur={commitField} />
                  <span className="suffix">px</span>
                </div>
              </div>
            </div>
          </>
        )}

        {(!selectedField.type || selectedField.type === 'text') && (
          <>
            <div className="props-group">
              <label>Fonte</label>
              <select 
                className="input" 
                value={selectedField.fontFamily || 'Inter'}
                onChange={e => updateField(selectedField.id, { fontFamily: e.target.value })}
                onBlur={commitField}
              >
                <optgroup label="Sistema">
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Montserrat">Montserrat</option>
                  <option value="Open Sans">Open Sans</option>
                </optgroup>
                {fonts.length > 0 && (
                  <optgroup label="Personalizadas">
                    {fonts.map(f => (
                      <option key={f} value={f.split('.')[0]}>{f.split('.')[0]}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div className="props-grid-2">
              <div className="props-group">
                <label>Tamanho</label>
                <div className="input-with-suffix">
                  <input className="input" type="number" min={8} max={200} value={selectedField.fontSize}
                    onChange={e => updateField(selectedField.id, { fontSize: parseInt(e.target.value) || 24 })}
                    onBlur={commitField} />
                  <span className="suffix">px</span>
                </div>
              </div>
              <div className="props-group">
                <label>Cor</label>
                <div className="color-picker-wrap">
                  <input type="color" value={selectedField.color}
                    onChange={e => updateField(selectedField.id, { color: e.target.value })}
                    onBlur={commitField}
                    className="color-input" />
                  <span className="color-hex">{selectedField.color}</span>
                </div>
              </div>
            </div>

            <div className="props-grid-2">
              <div className="props-group">
                <label>Estilo</label>
                <div className="btn-group w-full">
                  <button className={`btn flex-1 ${selectedField.fontWeight === 'bold' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { updateField(selectedField.id, { fontWeight: selectedField.fontWeight === 'bold' ? 'normal' : 'bold' }); commitField(); }}><Bold size={16} /></button>
                  <button className={`btn flex-1 ${selectedField.fontStyle === 'italic' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { updateField(selectedField.id, { fontStyle: selectedField.fontStyle === 'italic' ? 'normal' : 'italic' }); commitField(); }}><Italic size={16} /></button>
                </div>
              </div>

              <div className="props-group">
                <label>Alinhamento</label>
                <div className="btn-group w-full">
                  <button className={`btn flex-1 ${selectedField.align === 'left' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { updateField(selectedField.id, { align: 'left' }); commitField(); }}><AlignLeft size={16} /></button>
                  <button className={`btn flex-1 ${selectedField.align === 'center' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { updateField(selectedField.id, { align: 'center' }); commitField(); }}><AlignCenter size={16} /></button>
                  <button className={`btn flex-1 ${selectedField.align === 'right' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { updateField(selectedField.id, { align: 'right' }); commitField(); }}><AlignRight size={16} /></button>
                </div>
              </div>
            </div>

            <div className="props-group mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={selectedField.autoScale || false}
                  onChange={e => { updateField(selectedField.id, { autoScale: e.target.checked }); commitField(); }}
                  className="checkbox-input"
                />
                <span className="text-sm font-medium">Auto-Ajustar Fonte (Linha Única)</span>
              </label>
              <p className="text-xs text-muted mt-1">Diminui a fonte automaticamente para caber na largura.</p>
            </div>
          </>
        )}

        <div className="props-divider">GEOMETRIA</div>

        <div className="props-grid-2">
          <div className="props-group">
            <label>Posição X</label>
            <input className="input" type="number" value={Math.round(selectedField.posX)}
              onChange={e => updateField(selectedField.id, { posX: parseInt(e.target.value) || 0 })}
              onBlur={commitField} />
          </div>
          <div className="props-group">
            <label>Posição Y</label>
            <input className="input" type="number" value={Math.round(selectedField.posY)}
              onChange={e => updateField(selectedField.id, { posY: parseInt(e.target.value) || 0 })}
              onBlur={commitField} />
          </div>
          <div className="props-group">
            <label>Largura</label>
            <input className="input" type="number" value={selectedField.width || (selectedField.type === 'image' ? 100 : 300)}
              onChange={e => updateField(selectedField.id, { width: parseInt(e.target.value) || 100 })}
              onBlur={commitField} />
          </div>
          <div className="props-group">
            <label>Altura</label>
            <input className="input" type="number" value={selectedField.height || (selectedField.type === 'image' ? 100 : 40) }
              onChange={e => updateField(selectedField.id, { height: parseInt(e.target.value) || 40 })}
              onBlur={commitField} />
          </div>
        </div>

        <div className="props-group">
          <div className="props-label-row">
            <label>Opacidade</label>
            <span className="props-value">{selectedField.opacity || 100}%</span>
          </div>
          <input type="range" min={0} max={100} value={selectedField.opacity || 100}
            onChange={e => updateField(selectedField.id, { opacity: parseInt(e.target.value) })}
            onMouseUp={commitField}
            className="range-input" />
        </div>

        <div className="props-group">
          <div className="props-label-row">
            <label>Rotação</label>
            <span className="props-value">{selectedField.rotation || 0}°</span>
          </div>
          <input type="range" min={-180} max={180} value={selectedField.rotation || 0}
            onChange={e => updateField(selectedField.id, { rotation: parseInt(e.target.value) })}
            onMouseUp={commitField}
            className="range-input" />
        </div>

        <div className="props-actions">
          <button className="btn btn-danger btn-sm w-full"
            onClick={() => removeField(selectedField.id)}>
            <Trash2 size={14} /> 
            <span>Excluir Campo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
