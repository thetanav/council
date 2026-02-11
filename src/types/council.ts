export type LLMProvider = "openai" | "anthropic" | "google" | "ollama" | "openrouter";

export interface LLMParticipant {
  id: string;
  name: string;
  model: string;
  provider: LLMProvider;
  avatar: string;
  color: string;
  personality: string;
}

export interface DebateMessage {
  id: string;
  participantId: string;
  content: string;
  timestamp: Date;
  round: number;
}

export interface Vote {
  participantId: string;
  votedForId: string;
  position: string;
  reasoning: string;
  score: number;
}

export interface DebateState {
  id: string;
  question: string;
  participants: LLMParticipant[];
  messages: DebateMessage[];
  votes: Vote[];
  currentRound: number;
  maxRounds: number;
  status: "idle" | "debating" | "voting" | "concluded";
  finalAnswer?: string;
  consensus?: number;
}

export interface DebateConfig {
  question: string;
  participants: string[];
  maxRounds: number;
}
