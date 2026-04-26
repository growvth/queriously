import { create } from "zustand";

export type NoteType = "restatement" | "assumption" | "contradiction" | "connection" | "limitation";

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
  clear: () => set({ notes: [], isGenerating: false, error: null }),
}));
