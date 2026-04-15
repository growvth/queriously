import { useEffect } from "react";
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

  useEffect(() => {
    let cancelled = false;

    async function loadKey() {
      try {
        const stored = await api.getLlmApiKey();
        if (!cancelled) {
          setLlmApiKey(stored ?? "");
        }
      } catch {
        // Keep local memory empty; onboarding/settings can still continue.
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
