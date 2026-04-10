import { create } from "zustand";

export type ReadingMode = "explain" | "challenge" | "connect" | "annotate";
export type Confidence = "low" | "medium" | "high";

export type Source = {
  paper_id: string;
  page: number;
  section: string | null;
  text: string;
  score: number;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  confidence?: Confidence;
  counterpoint?: string | null;
  followup_question?: string | null;
  margin_note?: string | null;
  reading_mode?: ReadingMode;
  isStreaming?: boolean;
};

type ChatState = {
  messages: ChatMessage[];
  readingMode: ReadingMode;
  isLoading: boolean;

  setReadingMode: (mode: ReadingMode) => void;
  addMessage: (msg: ChatMessage) => void;
  appendToken: (id: string, token: string) => void;
  finalizeMessage: (id: string, data: Partial<ChatMessage>) => void;
  setLoading: (v: boolean) => void;
  clearChat: () => void;
};

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  readingMode: "explain",
  isLoading: false,

  setReadingMode: (mode) => set({ readingMode: mode }),

  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, msg] })),

  appendToken: (id, token) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + token } : m,
      ),
    })),

  finalizeMessage: (id, data) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, ...data, isStreaming: false } : m,
      ),
    })),

  setLoading: (v) => set({ isLoading: v }),
  clearChat: () => set({ messages: [] }),
}));
