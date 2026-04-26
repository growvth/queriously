import { useEffect, useRef } from "react";
import { useSettingsStore } from "../store/settingsStore";
import { api } from "../lib/tauri";

/**
 * On app startup, push the locally-stored LLM config to the Python sidecar
 * so it knows which model/key/base to use. Retries once after a short delay
 * (sidecar may still be starting).
 */
export function useLlmConfig() {
  const llmModel = useSettingsStore((s) => s.llmModel);
  const llmApiKey = useSettingsStore((s) => s.llmApiKey);
  const llmApiKeyLoaded = useSettingsStore((s) => s.llmApiKeyLoaded);
  const llmBaseUrl = useSettingsStore((s) => s.llmBaseUrl);
  const setLlmApiKey = useSettingsStore((s) => s.setLlmApiKey);
  const setLlmApiKeyLoaded = useSettingsStore((s) => s.setLlmApiKeyLoaded);
  const lastSyncedApiKeyRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadKey() {
      try {
        const stored = await api.getLlmApiKey();
        if (!cancelled) {
          const key = stored ?? "";
          lastSyncedApiKeyRef.current = key;
          setLlmApiKey(key);
        }
      } catch (err) {
        console.warn("failed to load LLM API key", err);
        // Keep local memory empty; onboarding/settings can still continue.
        // Do not mark the empty value as synced or the next effect may delete
        // a keychain item that merely failed to read.
        lastSyncedApiKeyRef.current = null;
      } finally {
        if (!cancelled) {
          setLlmApiKeyLoaded(true);
        }
      }
    }

    loadKey();
    return () => {
      cancelled = true;
    };
  }, [setLlmApiKey, setLlmApiKeyLoaded]);

  useEffect(() => {
    if (!llmApiKeyLoaded) return;
    if (lastSyncedApiKeyRef.current === llmApiKey) return;
    if (lastSyncedApiKeyRef.current === null && !llmApiKey) return;

    api
      .setLlmApiKey(llmApiKey || null)
      .then(() => {
        lastSyncedApiKeyRef.current = llmApiKey;
      })
      .catch((err) => {
        console.warn("failed to persist LLM API key", err);
      });
  }, [llmApiKey, llmApiKeyLoaded]);

  useEffect(() => {
    let cancelled = false;

    async function push() {
      if (!llmApiKeyLoaded) return;
      const config = {
        model: llmModel,
        api_key: llmApiKey || null,
        base_url: llmBaseUrl || null,
      };
      // Don't push the default Ollama config if user hasn't onboarded yet
      if (!config.model) return;
      try {
        await api.updateLlmConfig(config);
      } catch {
        // Sidecar might not be ready yet — retry once after 3s
        if (!cancelled) {
          setTimeout(async () => {
            if (cancelled) return;
            try {
              await api.updateLlmConfig(config);
            } catch {
              // Silent — StatusBar shows AI offline indicator
            }
          }, 3000);
        }
      }
    }

    push();
    return () => {
      cancelled = true;
    };
  }, [llmApiKey, llmApiKeyLoaded, llmBaseUrl, llmModel]);
}
