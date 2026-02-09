"use client";

import { useState, useCallback, useRef } from "react";
import { DebateMessage, Vote, LLMParticipant } from "@/types/council";

interface StreamParticipant {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

interface UseDebateStreamReturn {
  messages: DebateMessage[];
  votes: Vote[];
  participants: LLMParticipant[];
  currentSpeaker: string | undefined;
  currentVoter: string | undefined;
  streamingContent: string | undefined;
  currentRound: number;
  status: "idle" | "debating" | "voting" | "concluded" | "error";
  consensus: number | undefined;
  error: string | undefined;
  startDebate: (
    question: string,
    participantIds: string[],
    maxRounds: number,
    allParticipants: LLMParticipant[]
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
    "idle" | "debating" | "voting" | "concluded" | "error"
  >("idle");
  const [consensus, setConsensus] = useState<number | undefined>();
  const [error, setError] = useState<string | undefined>();
  
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
        break;

      case "round-start":
        setCurrentRound(data.round as number);
        break;

      case "speaking":
        setCurrentSpeaker(data.participantId as string);
        setStreamingContent("");
        break;

      case "chunk":
        setStreamingContent(data.fullText as string);
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
        // Round completed
        break;

      case "voting-start":
        setStatus("voting");
        break;

      case "voting":
        setCurrentVoter(data.participantId as string);
        break;

      case "vote":
        setVotes((prev) => [...prev, data as unknown as Vote]);
        setCurrentVoter(undefined);
        break;

      case "debate-end":
        setConsensus(data.consensus as number);
        setStatus("concluded");
        break;

      case "error":
        setError(data.message as string);
        setStatus("error");
        break;
    }
  }, []);

  const startDebate = useCallback(
    async (
      question: string,
      participantIds: string[],
      maxRounds: number,
      allParticipants: LLMParticipant[]
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
          
          // Process complete SSE messages
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
                // Ignore parse errors
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
    startDebate,
    reset,
  };
}
