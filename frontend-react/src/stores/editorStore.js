import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const MAX_HISTORY = 50;

const useEditorStore = create(
  persist(
    (set, get) => ({
      // ── State ──
      template: null,
      templateImage: null,
      fields: [],
      selectedFieldId: null,
      students: [],
      currentStudentIndex: 0,
      zoom: 100,
      canvasSize: { w: 841, h: 595 },
      projectName: 'Projeto Sem Título',
      projectId: null, // The UID of the project in the DB
      // ── History (Undo/Redo) ──
      history: [],
      historyIndex: -1,

      _pushHistory: () => {
        const { fields, history, historyIndex } = get();
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(fields)));
        if (newHistory.length > MAX_HISTORY) newHistory.shift();
        set({ history: newHistory, historyIndex: newHistory.length - 1 });
      },

      undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex <= 0) return;
        const newIndex = historyIndex - 1;
        set({ fields: JSON.parse(JSON.stringify(history[newIndex])), historyIndex: newIndex, selectedFieldId: null });
      },

      redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex >= history.length - 1) return;
        const newIndex = historyIndex + 1;
        set({ fields: JSON.parse(JSON.stringify(history[newIndex])), historyIndex: newIndex, selectedFieldId: null });
      },

      canUndo: () => get().historyIndex > 0,
      canRedo: () => get().historyIndex < get().history.length - 1,

      // ── Template ──
      setTemplate: (template, imageUrl) => set({ template, templateImage: imageUrl }),
      clearTemplate: () => set({ template: null, templateImage: null, fields: [], history: [], historyIndex: -1 }),

      // ── Fields ──
      addField: (field) => {
        const { _pushHistory } = get();
        _pushHistory();
        set(state => ({
          fields: [...state.fields, { ...field, id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` }]
        }));
      },

      updateField: (id, updates) => set(state => ({
        fields: state.fields.map(f => f.id === id ? { ...f, ...updates } : f)
      })),

      // Commit to history after drag ends or input blur
      commitField: () => get()._pushHistory(),

      removeField: (id) => {
        const { _pushHistory } = get();
        _pushHistory();
        set(state => ({
          fields: state.fields.filter(f => f.id !== id),
          selectedFieldId: state.selectedFieldId === id ? null : state.selectedFieldId
        }));
      },

      reorderField: (id, direction) => {
        const { _pushHistory } = get();
        _pushHistory();
        set(state => {
          const idx = state.fields.findIndex(f => f.id === id);
          if (idx === -1) return state;
          const newFields = [...state.fields];
          const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
          if (targetIdx < 0 || targetIdx >= newFields.length) return state;
          [newFields[idx], newFields[targetIdx]] = [newFields[targetIdx], newFields[idx]];
          return { fields: newFields };
        });
      },

      selectField: (id) => set({ selectedFieldId: id }),
      deselectField: () => set({ selectedFieldId: null }),

      // ── Students ──
      addStudent: (student) => set(state => ({ students: [...state.students, student] })),
      setStudents: (students) => set({ students }),
      updateStudent: (index, updates) => set(state => {
        const newStudents = [...state.students];
        const student = newStudents[index];
        // Ensure student is an object before merging
        const currentData = typeof student === 'string' ? { nome: student } : (student || {});
        newStudents[index] = { ...currentData, ...updates };
        return { students: newStudents };
      }),
      removeStudent: (index) => set(state => ({
        students: state.students.filter((_, i) => i !== index),
        currentStudentIndex: Math.min(state.currentStudentIndex, Math.max(0, state.students.length - 2))
      })),
      clearStudents: () => set({ students: [], currentStudentIndex: 0 }),
      nextStudent: () => set(state => ({ currentStudentIndex: Math.min(state.currentStudentIndex + 1, state.students.length - 1) })),
      prevStudent: () => set(state => ({ currentStudentIndex: Math.max(state.currentStudentIndex - 1, 0) })),

      // ── Zoom ──
      setZoom: (zoom) => set({ zoom: Math.max(25, Math.min(300, zoom)) }),
      zoomIn: () => set(state => ({ zoom: Math.min(300, state.zoom + 10) })),
      zoomOut: () => set(state => ({ zoom: Math.max(25, state.zoom - 10) })),

      // ── Canvas ──
      setCanvasSize: (w, h) => {
        let finalW = 841;
        let finalH = 595;

        if (typeof w === 'object' && w !== null) {
          // Handle {w, h} or accidentally nested/passed structures
          finalW = w.w;
          finalH = w.h;
          
          // Double nesting check (legacy fix)
          if (typeof finalW === 'object' && finalW !== null) {
            finalH = finalW.h;
            finalW = finalW.w;
          }
        } else {
          finalW = w;
          finalH = h;
        }

        set({ canvasSize: { w: finalW || 841, h: finalH || 595 } });
      },

      // ── Project ──
      setProjectName: (name) => set({ projectName: name }),    }),
    {
      name: 'cf-editor-storage', // Nome da chave no localStorage
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        students: state.students, 
        currentStudentIndex: state.currentStudentIndex,
        fields: state.fields,
        projectName: state.projectName,
        template: state.template,
        templateImage: state.templateImage,
        projectId: state.projectId,
        canvasSize: state.canvasSize
      }), // Persistir apenas os dados essenciais do projeto e participantes
    }
  )
);

export default useEditorStore;
