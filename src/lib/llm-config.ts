import { LLMParticipant } from "@/types/council";

export const AVAILABLE_LLMS: LLMParticipant[] = [
  {
    id: "gemma3",
    name: "gemma3",
    model: "gemma3:1b",
    provider: "ollama",
    avatar: "G",
    color: "#4285f4",
    personality:
      "You bring a fresh perspective and often think outside the box. You're good at making connections between different domains and offering creative solutions.",
  },
  {
    id: "qwen3",
    name: "qwen3",
    model: "qwen3:8b",
    provider: "ollama",
    avatar: "Q",
    color: "#34a853",
    personality:
      "You are High iq and adaptable. You quickly assess situations and provide practical insights. You're good at finding common ground in debates.",
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
