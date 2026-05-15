import { useState, useEffect, useRef } from 'react';
import useAuthStore from '../stores/authStore';
import useEditorStore from '../stores/editorStore';
import { X, CheckCircle2, AlertCircle, Smartphone, Mail, Play, Rocket, RefreshCw, Download } from 'lucide-react';
import Api from '../services/api';

export default function BatchModal({ isOpen, onClose }) {
  const { token } = useAuthStore();
  const students = useEditorStore(s => s.students);
  const template = useEditorStore(s => s.template);
  const fields = useEditorStore(s => s.fields);
  const storeCanvasSize = useEditorStore(s => s.canvasSize);
  const canvasSize = {
    w: typeof storeCanvasSize?.w === 'object' ? storeCanvasSize.w.w : (storeCanvasSize?.w || 841),
    h: typeof storeCanvasSize?.w === 'object' ? storeCanvasSize.w.h : (storeCanvasSize?.h || 595)
  };
  
  const [useWhatsapp, setUseWhatsapp] = useState(false);
  const [useEmail, setUseEmail] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(false);

  const [wppTemplate, setWppTemplate] = useState('Olá {nome}, seu certificado de {curso} já está pronto! 🚀 Segue em anexo.');
  const [emailSubject, setEmailSubject] = useState('Seu certificado de conclusão: {curso}');
  const [emailTemplate, setEmailTemplate] = useState(`
<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
  <h2 style="color: #6366f1;">Parabéns, {nome}!</h2>
  <p>É com grande alegria que entregamos o seu certificado de conclusão referente ao <strong>{curso}</strong>.</p>
  <p>O arquivo PDF oficial em alta resolução encontra-se em anexo a este email.</p>
  <br/>
  <p>Esperamos que este conhecimento alavanque sua carreira!</p>
  <p>Com os melhores cumprimentos,<br/>Equipe CertificaFacil</p>
</div>
`.trim());
  
  const [wppStatus, setWppStatus] = useState('loading'); // loading, ready, disconnected
  
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [statusText, setStatusText] = useState('Pronto para iniciar');
  const [logs, setLogs] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [generatedIds, setGeneratedIds] = useState([]);
  const logsEndRef = useRef(null);

  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;

  const checkStatus = async () => {
    try {
      const data = await Api.getWhatsappStatus();
      const isReady = data.status === 'ready' || data.status === 'authenticated';
      setWppStatus(isReady ? 'ready' : 'disconnected');
    } catch (e) {
      setWppStatus('disconnected');
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
      const interval = setInterval(checkStatus, 5000);
      return () => clearInterval(interval);
    } else {
      setProgress(0); setTotal(0); setLogs([]); setIsGenerating(false); setCompleted(false); setStatusText(''); 
      setUseWhatsapp(false); setUseEmail(false); setGeneratedIds([]);
    }
  }, [isOpen, token]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!isOpen) return null;

  const startBatch = async () => {
    if (students.length === 0) return alert('Nenhum participante carregado.');
    if (!template) return alert('Nenhum template PDF associado.');

    setIsGenerating(true);
    setCompleted(false);
    setLogs([{ type: 'info', msg: 'Preparando requisição...' }]);

    const CHUNK_SIZE = 50;
    const globalTotal = students.length;
    setTotal(globalTotal);
    let allGeneratedIds = [];
    
    try {
      for (let i = 0; i < globalTotal; i += CHUNK_SIZE) {
        const chunk = students.slice(i, i + CHUNK_SIZE);
        setLogs(prev => [...prev, { type: 'info', msg: `Enviando lote ${Math.floor(i / CHUNK_SIZE) + 1} de ${Math.ceil(globalTotal / CHUNK_SIZE)}...` }]);

        const resp = await Api.startBatch({
          templateFile: template,
          config: { 
            fields,
            canvasWidth: canvasSize.w,
            canvasHeight: canvasSize.h
          },
          students: chunk,
          sendWhatsapp: useWhatsapp,
          sendEmail: useEmail,
          skipDuplicates,
          whatsappTemplate: wppTemplate,
          emailSubject,
          emailTemplate
        });

        if (!resp.ok) {
          throw new Error(`Erro na API no lote ${i}: ${resp.statusText}`);
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          
          let lines = buffer.split('\n\n');
          buffer = lines.pop() || "";

          for (const block of lines) {
              const eventLine = block.split('\n').find(l => l.startsWith('event:'));
              const dataLine = block.split('\n').find(l => l.startsWith('data:'));

              if (eventLine && dataLine) {
                  const eventName = eventLine.replace('event:', '').trim();
                  const eventData = JSON.parse(dataLine.replace('data:', '').trim());

                  if (eventName === 'progress') {
                      setProgress(i + eventData.current);
                      setStatusText(eventData.message);
                  } else if (eventName === 'warning') {
                      setLogs(prev => [...prev, { type: 'warn', msg: eventData.message }]);
                  } else if (eventName === 'done') {
                      if (eventData.ids) {
                          allGeneratedIds = [...allGeneratedIds, ...eventData.ids];
                      }
                  } else if (eventName === 'error') {
                      setStatusText('Ocorreu um erro neste lote');
                      setLogs(prev => [...prev, { type: 'error', msg: eventData.error }]);
                  }
              }
          }
        }
      }
      
      // Quando todos os chunks terminam:
      setCompleted(true);
      setGeneratedIds(allGeneratedIds);
      setStatusText('Concluído com sucesso!');
      setLogs(prev => [...prev, { type: 'success', msg: `Finalizado! ${allGeneratedIds.length} PDFs gerados no total.` }]);

    } catch (e) {
      setLogs(prev => [...prev, { type: 'error', msg: `Falha do processo: ${e.message}` }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadZip = async () => {
    if (!generatedIds.length) return;
    try {
      const blob = await Api.downloadZip(generatedIds);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificados_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="shortcuts-overlay" onClick={isGenerating ? undefined : onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="shortcuts-modal" onClick={e => e.stopPropagation()} style={{ width: '450px', maxWidth: '90vw' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><Rocket size={20} color="var(--primary)" /> Geração em Lote</h3>
            {!isGenerating && <button className="btn btn-icon btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>}
        </div>

        {!isGenerating && !completed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '8px', fontSize: '0.9rem' }}>
                    <div><strong>Participantes carregados:</strong> {students.length}</div>
                    <div style={{ marginTop: '8px' }}><strong>Ação:</strong> Os PDFs serão gerados utilizando o template '{template}' com os campos mapeados.</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', opacity: wppStatus === 'ready' ? 1 : 0.5 }}>
                        <input type="checkbox" checked={useWhatsapp} onChange={e => wppStatus === 'ready' && setUseWhatsapp(e.target.checked)} disabled={wppStatus !== 'ready'} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Smartphone size={18} color="#25D366" />
                            <span>Entregar via WhatsApp</span>
                            {wppStatus !== 'ready' && <span style={{ fontSize: '0.7rem', color: '#ff4444', marginLeft: 'auto' }}>(Desconectado)</span>}
                        </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={useEmail} onChange={e => setUseEmail(e.target.checked)} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Mail size={18} color="#3b82f6" />
                            <span>Entregar via E-mail</span>
                        </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={skipDuplicates} onChange={e => setSkipDuplicates(e.target.checked)} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <RefreshCw size={18} color="var(--primary)" />
                            <span>Pular participantes já processados</span>
                        </div>
                    </label>

                    {useWhatsapp && (
                      <div style={{ marginTop: '8px', animation: 'slideDown 0.3s ease' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)' }}>Mensagem WhatsApp:</span>
                        <textarea 
                          className="input" 
                          style={{ minHeight: '80px', marginTop: '4px', fontSize: '0.8rem' }}
                          value={wppTemplate}
                          onChange={e => setWppTemplate(e.target.value)}
                        />
                        <small style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Variáveis: {'{nome}'}, {'{curso}'}, {'{vlink}'}</small>
                      </div>
                    )}

                    {useEmail && (
                      <div style={{ marginTop: '8px', animation: 'slideDown 0.3s ease' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)' }}>Assunto E-mail:</span>
                        <input 
                          className="input" 
                          style={{ marginTop: '4px', height: '32px', fontSize: '0.8rem' }}
                          value={emailSubject}
                          onChange={e => setEmailSubject(e.target.value)}
                        />
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginTop: '8px' }}>Corpo (HTML):</span>
                        <textarea 
                          className="input" 
                          style={{ minHeight: '120px', marginTop: '4px', fontSize: '0.75rem', fontFamily: 'monospace' }}
                          value={emailTemplate}
                          onChange={e => setEmailTemplate(e.target.value)}
                        />
                      </div>
                    )}
                </div>

                <button className="btn btn-primary w-full" onClick={startBatch} style={{ marginTop: '16px', height: '48px' }}>
                    <Play size={18} /> Iniciar Processamento Mágico
                </button>
            </div>
        )}

        {(isGenerating || completed) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ fontSize: '2rem', margin: '0 0 8px 0', color: completed ? '#10b981' : 'var(--text)' }}>{percentage}%</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{statusText}</p>
                </div>

                <div style={{ width: '100%', background: 'var(--border)', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${percentage}%`, height: '100%', background: completed ? '#10b981' : 'var(--primary)', transition: 'width 0.3s', borderRadius: '6px' }}></div>
                </div>

                <div style={{ background: '#111', borderRadius: '8px', padding: '12px', maxHeight: '150px', overflowY: 'auto', fontSize: '0.8rem', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {logs.map((L, i) => (
                        <div key={i} style={{ color: L.type === 'error' ? '#ff4444' : L.type === 'warn' ? '#fbbf24' : L.type === 'success' ? '#10b981' : '#9ca3af' }}>
                            {L.type === 'success' ? <CheckCircle2 size={12} style={{display:'inline', marginRight: 4, verticalAlign: 'middle'}}/> : null}
                            {L.type === 'error' ? <AlertCircle size={12} style={{display:'inline', marginRight: 4, verticalAlign: 'middle'}}/> : null}
                            {L.msg}
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>

                {completed && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button className="btn btn-primary w-full" onClick={downloadZip}>
                         <Download size={16} /> Baixar Tudo (.ZIP)
                      </button>
                      <button className="btn btn-secondary w-full" onClick={onClose}>
                         Fechar
                      </button>
                    </div>
                )}
            </div>
        )}

      </div>
    </div>
  );
}
