import { LLMParticipant } from "@/types/council";

export const AVAILABLE_LLMS: LLMParticipant[] = [
  {
    id: "gpt5",
    name: "gpt5",
    model: "gpt-5-2025-08-07",
    provider: "openai",
    avatar: "O",
    color: "#4285f4",
    personality:
      "",
  },
  {
    id: "qwen3",
    name: "qwen3",
    model: "qwen3:8b",
    provider: "ollama",
    avatar: "Q",
    color: "#34a853",
    personality:
      "",
  },
  {
    id: "gemini",
    name: "gemini",
    model: "gemini-flash-latest",
    provider: "google",
    avatar: "G",
    color: "#234d2eh",
    personality:
      "",
  },
  {
    id: "glm-4.6",
    name: "glm-4.6",
    model: "glm-4.6:cloud",
    provider: "ollama",
    avatar: "G",
    color: "#ad7f2b",
    personality:
      "",
  },
];

export const getLLMById = (id: string): LLMParticipant | undefined => {
  return AVAILABLE_LLMS.find((llm) => llm.id === id);
};

export const getLLMsByIds = (ids: string[]): LLMParticipant[] => {
  return ids
    .map((id) => getLLMById(id))
    .filter((llm): llm is LLMParticipant => llm !== undefined);
};
