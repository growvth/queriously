import { create } from "zustand";
import { api, type Session } from "../lib/tauri";

type SessionState = {
  sessions: Session[];
  loading: boolean;
  refresh: () => Promise<void>;
  createSession: (name: string, researchQuestion: string) => Promise<void>;
  addPaper: (sessionId: string, paperId: string) => Promise<void>;
};

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  loading: false,

  async refresh() {
    set({ loading: true });
    try {
      const sessions = await api.getSessions();
      set({ sessions });
    } finally {
      set({ loading: false });
    }
  },

  async createSession(name, researchQuestion) {
    await api.createSession(name, researchQuestion);
    await get().refresh();
  },

  async addPaper(sessionId, paperId) {
    await api.addPaperToSession(sessionId, paperId);
    await get().refresh();
  },
}));
