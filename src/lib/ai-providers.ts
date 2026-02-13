import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { LLMProvider } from "@/types/council";
import { ollama } from 'ollama-ai-provider-v2';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

export const MODELS_WITH_TOOL_SUPPORT: Record<string, boolean> = {
  // OpenAI models - all support tools
  "gpt-4o": true,
  "gpt-4o-mini": true,
  "gpt-4-turbo": true,
  "gpt-4": true,
  "gpt-3.5-turbo": true,
  // Anthropic models
  "claude-sonnet-4-20250514": true,
  "claude-opus-4-20250514": true,
  "claude-3-5-sonnet-20241022": true,
  "claude-3-5-haiku-20241022": true,
  "claude-3-opus-20240229": true,
  "claude-3-sonnet-20240229": true,
  "claude-3-haiku-20240307": true,
  // Google models
  "gemini-2.0-flash-exp": true,
  "gemini-2.0-flash": true,
  "gemini-1.5-pro": true,
  "gemini-1.5-flash": true,
  "gemini-1.5-flash-8b": true,
  // Ollama models - most don't support tools
  "llama3.1": false,
  "llama3": false,
  "mistral": false,
  "mixtral": false,
  "qwen2.5": false,
  "qwen3:8b": false,
  "glm-4.6": false,
};

export function supportsTools(provider: LLMProvider, modelId: string): boolean {
  if (provider === "ollama") return false;
  if (provider === "openrouter") return false;
  
  const modelKey = modelId.toLowerCase();
  if (MODELS_WITH_TOOL_SUPPORT[modelKey]) return true;
  
  if (provider === "openai") return true;
  if (provider === "anthropic") return true;
  if (provider === "google") return true;
  
  return false;
}

export function getModel(provider: LLMProvider, modelId: string) {
  switch (provider) {
    case "openai":
      return openai(modelId);
    case "anthropic":
      return anthropic(modelId);
    case "google":
      return google(modelId);
    case "ollama":
      return ollama(modelId)
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
