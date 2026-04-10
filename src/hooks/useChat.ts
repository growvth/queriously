import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef } from "react";
import { useChatStore, type ChatMessage } from "../store/chatStore";
import { usePdfStore } from "../store/pdfStore";

/**
 * Manages the chat lifecycle: sends questions via the ask_question Tauri
 * command, listens for streamed token events and the final done payload,
 * and pushes everything into the chat store.
 */
export function useChat() {
  const addMessage = useChatStore((s) => s.addMessage);
  const appendToken = useChatStore((s) => s.appendToken);
  const finalizeMessage = useChatStore((s) => s.finalizeMessage);
  const setLoading = useChatStore((s) => s.setLoading);
  const readingMode = useChatStore((s) => s.readingMode);
  const paper = usePdfStore((s) => s.paper);

  // Track the current streaming message id so event listeners can target it.
  const streamIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string>("default");

  // Set up global Tauri event listeners once.
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    listen<{ chat_session_id: string; token: string }>("ai:token", (e) => {
      const id = streamIdRef.current;
      if (id && e.payload.chat_session_id === sessionIdRef.current) {
        appendToken(id, e.payload.token);
      }
    }).then((u) => unsubs.push(u));

    listen<{
      chat_session_id: string;
      answer: string;
      sources: any[];
      confidence: string;
      counterpoint?: string | null;
      followup_question?: string | null;
      margin_note?: string | null;
    }>("ai:done", (e) => {
      const id = streamIdRef.current;
      if (id && e.payload.chat_session_id === sessionIdRef.current) {
        finalizeMessage(id, {
          content: e.payload.answer || "",
          sources: e.payload.sources,
          confidence: e.payload.confidence as any,
          counterpoint: e.payload.counterpoint,
          followup_question: e.payload.followup_question,
          margin_note: e.payload.margin_note,
        });
        streamIdRef.current = null;
        setLoading(false);
      }
    }).then((u) => unsubs.push(u));

    listen<{ chat_session_id: string; error: string }>("ai:error", (e) => {
      if (e.payload.chat_session_id === sessionIdRef.current) {
        const id = streamIdRef.current;
        if (id) {
          finalizeMessage(id, { content: `Error: ${e.payload.error}` });
        }
        streamIdRef.current = null;
        setLoading(false);
      }
    }).then((u) => unsubs.push(u));

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [appendToken, finalizeMessage, setLoading]);

  async function send(
    question: string,
    contextOverride?: string,
  ) {
    if (!paper) return;

    // Add user message.
    const userId = crypto.randomUUID();
    const userMsg: ChatMessage = {
      id: userId,
      role: "user",
      content: question,
      reading_mode: readingMode,
    };
    addMessage(userMsg);

    // Prepare assistant placeholder.
    const assistantId = crypto.randomUUID();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      reading_mode: readingMode,
      isStreaming: true,
    };
    addMessage(assistantMsg);
    streamIdRef.current = assistantId;
    setLoading(true);

    try {
      await invoke("ask_question", {
        question,
        paperId: paper.id,
        chatSessionId: sessionIdRef.current,
        readingMode: readingMode,
        contextPaperIds: [],
        contextOverride: contextOverride ?? null,
        topK: 5,
      });
    } catch (err) {
      finalizeMessage(assistantId, {
        content: `Failed to get response: ${err}`,
      });
      streamIdRef.current = null;
      setLoading(false);
    }
  }

  return { send };
}
