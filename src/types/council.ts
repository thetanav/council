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

export type DebatePhase = 
  | "idle" 
  | "debating" 
  | "cross-examination" 
  | "voting" 
  | "concluded"
  | "error";

export type SentimentType = "joy" | "anger" | "confidence" | "curiosity" | "neutral";

export interface SentimentData {
  participantId: string;
  sentiments: Record<SentimentType, number>;
}

export interface CrossExaminationQuestion {
  id: string;
  askerId: string;
  targetId: string;
  question: string;
  answer: string;
  round: number;
}

export interface TrendingTopic {
  id: string;
  topic: string;
  category: string;
  votes: number;
}

export interface DebateState {
  id: string;
  question: string;
  participants: LLMParticipant[];
  messages: DebateMessage[];
  votes: Vote[];
  currentRound: number;
  maxRounds: number;
  status: DebatePhase;
  finalAnswer?: string;
  consensus?: number;
}

export interface DebateConfig {
  question: string;
  participants: string[];
  maxRounds: number;
  enableDevilsAdvocate?: boolean;
  enableCrossExamination?: boolean;
  enableWebSearch?: boolean;
}
