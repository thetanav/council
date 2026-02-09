import { LLMParticipant } from "@/types/council";

export const AVAILABLE_LLMS: LLMParticipant[] = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    model: "gpt-4o",
    provider: "openai",
    avatar: "O",
    color: "#10a37f",
    personality:
      "You are a balanced and pragmatic debater. You focus on practical solutions and evidence-based reasoning. You acknowledge multiple perspectives but aim to find the most sensible answer.",
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    model: "gpt-4o-mini",
    provider: "openai",
    avatar: "Om",
    color: "#74aa9c",
    personality:
      "You are quick-thinking and efficient. You prefer concise, direct arguments and value clarity over complexity. You're good at summarizing key points.",
  },
  {
    id: "claude-sonnet",
    name: "Claude Sonnet",
    model: "claude-sonnet-4-20250514",
    provider: "anthropic",
    avatar: "C",
    color: "#d97706",
    personality:
      "You are thoughtful and nuanced in your responses. You consider ethical implications and edge cases. You're careful about uncertainty and transparent about limitations.",
  },
  {
    id: "claude-haiku",
    name: "Claude Haiku",
    model: "claude-3-5-haiku-latest",
    provider: "anthropic",
    avatar: "Ch",
    color: "#ea580c",
    personality:
      "You are swift and precise. You cut through complexity to find the core of the issue. You value efficiency but maintain accuracy.",
  },
  {
    id: "gemini-pro",
    name: "Gemini 2.0 Flash",
    model: "gemini-2.0-flash",
    provider: "google",
    avatar: "G",
    color: "#4285f4",
    personality:
      "You bring a fresh perspective and often think outside the box. You're good at making connections between different domains and offering creative solutions.",
  },
  {
    id: "gemini-flash",
    name: "Gemini 2.5 Flash",
    model: "gemini-2.5-flash-preview-05-20",
    provider: "google",
    avatar: "Gf",
    color: "#34a853",
    personality:
      "You are fast and adaptable. You quickly assess situations and provide practical insights. You're good at finding common ground in debates.",
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
