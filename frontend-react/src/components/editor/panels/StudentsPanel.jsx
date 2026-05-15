import { Plus, UploadCloud, Search, Users, Trash2 } from 'lucide-react';
import useEditorStore from '../../../stores/editorStore';

export default function StudentsPanel({ 
  csvInputRef, handleCsvUpload, studentSearch, setStudentSearch 
}) {
  const students = useEditorStore(s => s.students);
  const currentStudentIndex = useEditorStore(s => s.currentStudentIndex);
  const addStudent = useEditorStore(s => s.addStudent);
  const updateStudent = useEditorStore(s => s.updateStudent);
  const removeStudent = useEditorStore(s => s.removeStudent);

  const safeSearch = (studentSearch || '').toLowerCase().trim();
  const filteredStudents = students
    .map((s, i) => ({ student: s || {}, originalIndex: i }))
    .filter(item => {
      if (!safeSearch) return true;
      const s = item.student;
      return String(s.nome || '').toLowerCase().includes(safeSearch) || 
             String(s.email || '').toLowerCase().includes(safeSearch) ||
             String(s.curso || '').toLowerCase().includes(safeSearch);
    });

  return (
    <>
      <div className="panel-section">
        <div className="panel-section-title">Gerenciar Destinatários</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-premium flex-1" onClick={() => addStudent({ nome: '' })}>
            <Plus size={16} /> Novo Participante
          </button>
          <button className="btn btn-glass" onClick={() => csvInputRef.current?.click()}>
            <UploadCloud size={16} /> Importar CSV
          </button>
        </div>
        <input ref={csvInputRef} type="file" accept=".csv" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleCsvUpload(f); e.target.value = ''; }} />
      </div>
      
      <div className="panel-section">
        <div className="panel-section-title" style={{ justifyContent: 'space-between', marginBottom: '12px' }}>
          LISTA DE PARTICIPANTES ({students.length})
          <button className="btn-text-link" onClick={() => { if(window.confirm('Limpar toda a lista?')) useEditorStore.getState().clearStudents(); }}>
            Limpar Tudo
          </button>
        </div>

        <div className="panel-search-wrapper">
          <input 
            type="text" 
            className="panel-search-input" 
            placeholder="Buscar participante por nome ou email..."
            value={studentSearch}
            onChange={e => setStudentSearch(e.target.value)}
          />
          <Search className="panel-search-icon" size={14} />
        </div>

        <div className="student-list">
          {students.length === 0 ? (
            <div className="empty-panel-box">
               <Users size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
               <p>Nenhum participante adicionado ainda.</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="empty-panel-box">
               <Search size={32} style={{ opacity: 0.1, marginBottom: '12px' }} />
               <p>Nenhum participante encontrado para "{studentSearch}"</p>
            </div>
          ) : (
            filteredStudents.map((item) => {
              const s = item.student;
              const i = item.originalIndex;
              const isActive = currentStudentIndex === i;
              return (
                <div key={i} className={`student-card ${isActive ? 'active' : ''}`}>
                  <div className="student-card-header" onClick={() => useEditorStore.setState({ currentStudentIndex: i })}>
                    <div className="student-info-mini">
                      <span className="student-name-mini">{s.nome || `Participante ${i+1}`}</span>
                      <div className="student-meta-mini">
                        {s.curso ? <span>{s.curso}</span> : <span className="empty-val">Sem curso</span>}
                        <span className="meta-sep">•</span>
                        <span>{s.email || s.whatsapp || 'Sem contato'}</span>
                      </div>
                    </div>
                    <div className="student-card-actions">
                      <span className="student-index">#{i + 1}</span>
                      {isActive && (
                        <button className="btn-icon btn-sm btn-ghost" style={{ color: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); removeStudent(i); }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {isActive && (
                    <div className="student-card-body">
                      <div className="form-grid-elite">
                        <div className="form-group span-10">
                          <label className="micro-label">Nome Completo</label>
                          <input type="text" className="input input-sm" placeholder="Ex: João Silva" value={s.nome || ''} 
                            onChange={e => updateStudent(i, { nome: e.target.value })} onClick={e => e.stopPropagation()} />
                        </div>
                        
                        <div className="form-group span-5">
                          <label className="micro-label">E-mail</label>
                          <input type="email" className="input input-sm" placeholder="contato@email.com" value={s.email || ''} 
                            onChange={e => updateStudent(i, { email: e.target.value })} onClick={e => e.stopPropagation()} />
                        </div>
                        <div className="form-group span-5">
                          <label className="micro-label">WhatsApp</label>
                          <input type="text" className="input input-sm" placeholder="(00) 00000-0000" value={s.whatsapp || ''} 
                            onChange={e => updateStudent(i, { whatsapp: e.target.value })} onClick={e => e.stopPropagation()} />
                        </div>

                        <div className="form-group span-7">
                          <label className="micro-label">Curso / Título</label>
                          <input type="text" className="input input-sm" placeholder="Nome do treinamento" value={s.curso || ''} 
                            onChange={e => updateStudent(i, { curso: e.target.value })} onClick={e => e.stopPropagation()} />
                        </div>
                        <div className="form-group span-3">
                          <label className="micro-label">Carga H.</label>
                          <input type="text" className="input input-sm" placeholder="Ex: 40h" value={s.carga_horaria || ''} 
                            onChange={e => updateStudent(i, { carga_horaria: e.target.value })} onClick={e => e.stopPropagation()} />
                        </div>

                        <div className="form-group span-5">
                          <label className="micro-label">Data</label>
                          <input type="text" className="input input-sm" placeholder="10/04/2026" value={s.data || ''} 
                            onChange={e => updateStudent(i, { data: e.target.value })} onClick={e => e.stopPropagation()} />
                        </div>
                        <div className="form-group span-5">
                          <label className="micro-label">Instituição</label>
                          <input type="text" className="input input-sm" placeholder="Opcional" value={s.instituicao || ''} 
                            onChange={e => updateStudent(i, { instituicao: e.target.value })} onClick={e => e.stopPropagation()} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
