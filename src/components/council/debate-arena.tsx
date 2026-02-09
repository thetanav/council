"use client";

import { DebateMessage, LLMParticipant } from "@/types/council";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useRef } from "react";

interface DebateArenaProps {
  messages: DebateMessage[];
  participants: LLMParticipant[];
  currentSpeaker?: string;
  streamingContent?: string;
  currentRound?: number;
}

export function DebateArena({
  messages,
  participants,
  currentSpeaker,
  streamingContent,
  currentRound,
}: DebateArenaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const getParticipant = (id: string) => {
    return participants.find((p) => p.id === id);
  };

  const groupedByRound = messages.reduce((acc, msg) => {
    if (!acc[msg.round]) {
      acc[msg.round] = [];
    }
    acc[msg.round].push(msg);
    return acc;
  }, {} as Record<number, DebateMessage[]>);

  return (
    <ScrollArea className="h-[600px] pr-4" ref={scrollRef}>
      <div className="space-y-4">
        {Object.entries(groupedByRound).map(([round, roundMessages]) => (
          <div key={round} className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Round {round}
              </Badge>
              <div className="flex-1 h-px bg-border" />
            </div>

            {roundMessages.map((message) => {
              const participant = getParticipant(message.participantId);
              if (!participant) return null;

              return (
                <Card key={message.id} className="overflow-hidden">
                  <div
                    className="h-1"
                    style={{ backgroundColor: participant.color }}
                  />
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <Avatar
                        className="h-8 w-8 flex-shrink-0"
                        style={{ backgroundColor: participant.color }}
                      >
                        <AvatarFallback
                          className="text-white text-xs font-semibold"
                          style={{ backgroundColor: participant.color }}
                        >
                          {participant.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-sm">
                            {participant.name}
                          </span>
                        </div>
                        <div className="text-sm text-foreground/90 whitespace-pre-wrap">
                          {message.content}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ))}

        {/* Streaming message */}
        {currentSpeaker && streamingContent && (
          <div className="space-y-3">
            {currentRound && !groupedByRound[currentRound] && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Round {currentRound}
                </Badge>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}
            
            {(() => {
              const participant = getParticipant(currentSpeaker);
              if (!participant) return null;

              return (
                <Card className="overflow-hidden border-primary/50">
                  <div
                    className="h-1 animate-pulse"
                    style={{ backgroundColor: participant.color }}
                  />
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <Avatar
                        className="h-8 w-8 flex-shrink-0 ring-2 ring-primary/50 animate-pulse"
                        style={{ backgroundColor: participant.color }}
                      >
                        <AvatarFallback
                          className="text-white text-xs font-semibold"
                          style={{ backgroundColor: participant.color }}
                        >
                          {participant.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-sm">
                            {participant.name}
                          </span>
                          <Badge variant="secondary" className="text-xs animate-pulse">
                            Speaking...
                          </Badge>
                        </div>
                        <div className="text-sm text-foreground/90 whitespace-pre-wrap">
                          {streamingContent}
                          <span className="inline-block w-2 h-4 bg-primary/50 animate-pulse ml-0.5" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        )}

        {messages.length === 0 && !currentSpeaker && (
          <div className="text-center text-muted-foreground py-12">
            <p>The debate arena is empty.</p>
            <p className="text-sm mt-1">Start a debate to see the discussion here.</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
