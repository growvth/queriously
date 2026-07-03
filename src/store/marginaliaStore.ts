import { create } from "zustand";
import { api } from "../lib/tauri";
import type { Annotation } from "./annotationStore";

export type NoteType = "manual" | "restatement" | "assumption" | "contradiction" | "connection" | "limitation";

export type MarginaliaNote = {
  id: string;
  page: number;
  paragraph_index: number;
  type: NoteType;
  note_text: string;
  ref_page?: number | null;
  is_edited?: boolean;
  edited_text?: string | null;
};

type MarginaliaState = {
  notes: MarginaliaNote[];
  visible: boolean;
  filterType: NoteType | null;
  isGenerating: boolean;
  error: string | null;

  setNotes: (notes: MarginaliaNote[]) => void;
  addNote: (note: MarginaliaNote) => void;
  setVisible: (v: boolean) => void;
  setFilterType: (t: NoteType | null) => void;
  setGenerating: (v: boolean) => void;
  setError: (error: string | null) => void;
  createManualNote: (note: {
    paper_id: string;
    page: number;
    paragraph_index: number;
    note_text: string;
    ref_page?: number | null;
  }) => Promise<MarginaliaNote>;
  updateNote: (id: string, noteText: string, type?: NoteType) => Promise<MarginaliaNote>;
  deleteNote: (id: string) => Promise<void>;
  promoteToAnnotation: (id: string) => Promise<Annotation>;
  clear: () => void;
};

export const useMarginaliaStore = create<MarginaliaState>((set) => ({
  notes: [],
  visible: true,
  filterType: null,
  isGenerating: false,
  error: null,

  setNotes: (notes) => set({ notes }),
  addNote: (note) => set((s) => ({ notes: [...s.notes, note], error: null })),
  setVisible: (v) => set({ visible: v }),
  setFilterType: (t) => set({ filterType: t }),
  setGenerating: (v) => set(v ? { isGenerating: v, error: null } : { isGenerating: v }),
  setError: (error) => set({ error, isGenerating: false }),
  async createManualNote(note) {
    const created = await api.createMarginaliaNote({
      ...note,
      type: "manual",
    }) as MarginaliaNote;
    set((s) => ({ notes: [...s.notes, created], visible: true, error: null }));
    return created;
  },
  async updateNote(id, noteText, type) {
    const updated = await api.updateMarginaliaNote(id, noteText, type ?? null) as MarginaliaNote;
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? updated : n)),
    }));
    return updated;
  },
  async deleteNote(id) {
    await api.deleteMarginaliaNote(id);
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
  },
  async promoteToAnnotation(id) {
    return await api.promoteMarginaliaToAnnotation(id) as Annotation;
  },
  clear: () => set({ notes: [], isGenerating: false, error: null }),
}));
