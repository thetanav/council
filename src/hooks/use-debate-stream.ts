"use client";

import { useState, useCallback, useRef } from "react";
import { DebateMessage, Vote, LLMParticipant, CrossExaminationQuestion, SentimentData, SentimentType } from "@/types/council";

interface StreamParticipant {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

interface SentimentEvent {
  participantId: string;
  messageId: string;
  sentiment: Record<SentimentType, number>;
}

interface UseDebateStreamReturn {
  messages: DebateMessage[];
  votes: Vote[];
  participants: LLMParticipant[];
  currentSpeaker: string | undefined;
  currentVoter: string | undefined;
  streamingContent: string | undefined;
  currentRound: number;
  status: "idle" | "debating" | "cross-examination" | "voting" | "concluded" | "error";
  consensus: number | undefined;
  error: string | undefined;
  crossExamQuestions: CrossExaminationQuestion[];
  currentCrossExamQuestion: CrossExaminationQuestion | undefined;
  streamingCrossExamAnswer: string | undefined;
  sentiments: Map<string, SentimentData>;
  devilsAdvocateId: string | undefined;
  enableWebSearch: boolean;
  enableCrossExamination: boolean;
  enableDevilsAdvocate: boolean;
  startDebate: (
    question: string,
    participantIds: string[],
    maxRounds: number,
    allParticipants: LLMParticipant[],
    options?: {
      enableDevilsAdvocate?: boolean;
      enableCrossExamination?: boolean;
      enableWebSearch?: boolean;
    }
  ) => Promise<void>;
  reset: () => void;
}

export function useDebateStream(): UseDebateStreamReturn {
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [participants, setParticipants] = useState<LLMParticipant[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | undefined>();
  const [currentVoter, setCurrentVoter] = useState<string | undefined>();
  const [streamingContent, setStreamingContent] = useState<string | undefined>();
  const [currentRound, setCurrentRound] = useState(1);
  const [status, setStatus] = useState<
    "idle" | "debating" | "cross-examination" | "voting" | "concluded" | "error"
  >("idle");
  const [consensus, setConsensus] = useState<number | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [crossExamQuestions, setCrossExamQuestions] = useState<CrossExaminationQuestion[]>([]);
  const [currentCrossExamQuestion, setCurrentCrossExamQuestion] = useState<CrossExaminationQuestion | undefined>();
  const [streamingCrossExamAnswer, setStreamingCrossExamAnswer] = useState<string | undefined>();
  const [sentiments, setSentiments] = useState<Map<string, SentimentData>>(new Map());
  const [devilsAdvocateId, setDevilsAdvocateId] = useState<string | undefined>();
  const [enableWebSearch, setEnableWebSearch] = useState(false);
  const [enableCrossExamination, setEnableCrossExamination] = useState(false);
  const [enableDevilsAdvocate, setEnableDevilsAdvocate] = useState(false);
  
  const allParticipantsRef = useRef<LLMParticipant[]>([]);

  const reset = useCallback(() => {
    setMessages([]);
    setVotes([]);
    setParticipants([]);
    setCurrentSpeaker(undefined);
    setCurrentVoter(undefined);
    setStreamingContent(undefined);
    setCurrentRound(1);
    setStatus("idle");
    setConsensus(undefined);
    setError(undefined);
    setCrossExamQuestions([]);
    setCurrentCrossExamQuestion(undefined);
    setStreamingCrossExamAnswer(undefined);
    setSentiments(new Map());
    setDevilsAdvocateId(undefined);
    setEnableWebSearch(false);
    setEnableCrossExamination(false);
    setEnableDevilsAdvocate(false);
  }, []);

  const handleEvent = useCallback((eventType: string, data: Record<string, unknown>) => {
    const allParticipants = allParticipantsRef.current;
    
    switch (eventType) {
      case "debate-start":
        setParticipants(
          (data.participants as StreamParticipant[]).map((p) => {
            const full = allParticipants.find((ap) => ap.id === p.id);
            return full || ({
              ...p,
              model: "",
              provider: "openai" as const,
              personality: "",
            });
          })
        );
        setEnableWebSearch(!!data.enableWebSearch);
        setEnableCrossExamination(!!data.enableCrossExamination);
        setEnableDevilsAdvocate(!!data.enableDevilsAdvocate);
        break;

      case "round-start":
        setCurrentRound(data.round as number);
        break;

      case "devils-advocate":
        setDevilsAdvocateId(data.participantId as string);
        break;

      case "speaking":
        setCurrentSpeaker(data.participantId as string);
        setCurrentVoter(undefined);
        setStreamingContent("");
        setCurrentCrossExamQuestion(undefined);
        setStreamingCrossExamAnswer(undefined);
        break;

      case "chunk":
        setStreamingContent(data.fullText as string);
        break;

      case "sentiment":
        const sentimentData = data as unknown as SentimentEvent;
        setSentiments(prev => {
          const newMap = new Map(prev);
          newMap.set(sentimentData.participantId, {
            participantId: sentimentData.participantId,
            sentiments: sentimentData.sentiment
          });
          return newMap;
        });
        break;

      case "message-complete":
        setMessages((prev) => [
          ...prev,
          {
            id: data.messageId as string,
            participantId: data.participantId as string,
            content: data.content as string,
            timestamp: new Date(),
            round: data.round as number,
          },
        ]);
        setCurrentSpeaker(undefined);
        setStreamingContent(undefined);
        break;

      case "round-end":
        break;

      case "cross-exam-start":
        setStatus("cross-examination");
        setCurrentSpeaker(undefined);
        break;

      case "cross-exam-question":
        setCurrentCrossExamQuestion({
          id: data.questionId as string,
          askerId: data.askerId as string,
          targetId: data.targetId as string,
          question: "",
          answer: "",
          round: 1
        });
        break;

      case "cross-exam-question-stream":
        setCurrentCrossExamQuestion(prev => prev ? {
          ...prev,
          question: data.chunk as string
        } : undefined);
        break;

      case "cross-exam-question-complete":
        setCurrentCrossExamQuestion(prev => prev ? {
          ...prev,
          question: data.question as string
        } : undefined);
        break;

      case "cross-exam-answer":
        setCurrentSpeaker(data.targetId as string);
        setStreamingCrossExamAnswer("");
        break;

      case "cross-exam-answer-stream":
        setStreamingCrossExamAnswer(data.chunk as string);
        break;

      case "cross-exam-answer-complete":
        if (currentCrossExamQuestion) {
          const updated: CrossExaminationQuestion = {
            ...currentCrossExamQuestion,
            answer: data.answer as string,
          };
          setCrossExamQuestions(prev => [...prev, updated]);
        }
        setCurrentSpeaker(undefined);
        setStreamingCrossExamAnswer(undefined);
        setCurrentCrossExamQuestion(undefined);
        break;

      case "cross-exam-end":
        break;

      case "voting-start":
        setStatus("voting");
        setCurrentSpeaker(undefined);
        break;

      case "voting":
        setCurrentVoter(data.participantId as string);
        setCurrentSpeaker(undefined);
        break;

      case "vote":
        setVotes((prev) => [...prev, data as unknown as Vote]);
        setCurrentVoter(undefined);
        break;

      case "debate-end":
        setConsensus(data.consensus as number);
        setStatus("concluded");
        break;

      case "heartbeat":
        break;

      case "error":
        setError(data.message as string);
        setStatus("error");
        break;
    }
  }, [currentCrossExamQuestion]);

  const startDebate = useCallback(
    async (
      question: string,
      participantIds: string[],
      maxRounds: number,
      allParticipants: LLMParticipant[],
      options?: {
        enableDevilsAdvocate?: boolean;
        enableCrossExamination?: boolean;
        enableWebSearch?: boolean;
      }
    ) => {
      reset();
      setStatus("debating");
      allParticipantsRef.current = allParticipants;

      try {
        const response = await fetch("/api/debate/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            participantIds,
            maxRounds,
            enableDevilsAdvocate: options?.enableDevilsAdvocate,
            enableCrossExamination: options?.enableCrossExamination,
            enableWebSearch: options?.enableWebSearch,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to start debate");
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          
          const messages = buffer.split("\n\n");
          buffer = messages.pop() || "";

          for (const message of messages) {
            if (!message.trim()) continue;
            
            const lines = message.split("\n");
            let eventType = "";
            let dataStr = "";

            for (const line of lines) {
              if (line.startsWith("event: ")) {
                eventType = line.slice(7).trim();
              } else if (line.startsWith("data: ")) {
                dataStr = line.slice(6);
              }
            }

            if (eventType && dataStr) {
              try {
                const data = JSON.parse(dataStr);
                handleEvent(eventType, data);
              } catch {
              }
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setStatus("error");
      }
    },
    [reset, handleEvent]
  );

  return {
    messages,
    votes,
    participants,
    currentSpeaker,
    currentVoter,
    streamingContent,
    currentRound,
    status,
    consensus,
    error,
    crossExamQuestions,
    currentCrossExamQuestion,
    streamingCrossExamAnswer,
    sentiments,
    devilsAdvocateId,
    enableWebSearch,
    enableCrossExamination,
    enableDevilsAdvocate,
    startDebate,
    reset,
  };
}
