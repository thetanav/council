"use client";

import { Streamdown } from "streamdown";
import { DebateMessage, LLMParticipant } from "@/types/council";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type React from "react";
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

  const handleCollapsed = (event: React.MouseEvent<HTMLButtonElement>) => {
    const target = event.currentTarget.nextElementSibling as HTMLElement | null;
    if (!target) return;
    const isCollapsed = target.getAttribute("data-collapsed") === "true";
    target.setAttribute("data-collapsed", String(!isCollapsed));
    target.classList.toggle("line-clamp-3", !isCollapsed);
  };

  return (
    <ScrollArea className="h-[520px] pr-3" ref={scrollRef}>
      <div className="space-y-3">
        {Object.entries(groupedByRound).map(([round, roundMessages]) => (
          <div key={round} className="space-y-2.5">
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
                    className="h-0.5"
                    style={{ backgroundColor: participant.color }}
                  />
                  <CardContent className="p-2.5">
                    <div className="flex items-start gap-2.5">
                      <Avatar
                        className="h-7 w-7 flex-shrink-0"
                        style={{ backgroundColor: participant.color }}
                      >
                        <AvatarFallback
                          className="text-white text-[11px] font-semibold"
                          style={{ backgroundColor: participant.color }}
                        >
                          {participant.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-semibold text-xs">
                            {participant.name}
                          </span>
                        </div>
                        <div className="text-xs text-foreground/90 prose prose-xs dark:prose-invert max-w-none [&_p]:mb-1.5 [&_p:last-child]:mb-0">
                          <button
                            type="button"
                            onClick={handleCollapsed}
                            className="text-[11px] text-muted-foreground mb-1"
                          >
                            Toggle response
                          </button>
                          <div data-collapsed="true" className="line-clamp-3">
                            <Streamdown>{message.content}</Streamdown>
                          </div>
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
          <div className="space-y-2.5">
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
                    className="h-0.5 animate-pulse"
                    style={{ backgroundColor: participant.color }}
                  />
                  <CardContent className="p-2.5">
                    <div className="flex items-start gap-2.5">
                      <Avatar
                        className="h-7 w-7 flex-shrink-0 ring-2 ring-primary/50 animate-pulse"
                        style={{ backgroundColor: participant.color }}
                      >
                        <AvatarFallback
                          className="text-white text-[11px] font-semibold"
                          style={{ backgroundColor: participant.color }}
                        >
                          {participant.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-semibold text-xs">
                            {participant.name}
                          </span>
                          <Badge variant="secondary" className="text-[11px] animate-pulse">
                            Speaking...
                          </Badge>
                        </div>
                        <div className="text-xs text-foreground/90 prose prose-xs dark:prose-invert max-w-none [&_p]:mb-1.5 [&_p:last-child]:mb-0">
                          <button
                            type="button"
                            onClick={handleCollapsed}
                            className="text-[11px] text-muted-foreground mb-1"
                          >
                            Toggle response
                          </button>
                          <div data-collapsed="true" className="line-clamp-3">
                            <Streamdown>{streamingContent}</Streamdown>
                          </div>
                          <span className="inline-block w-2 h-4 bg-primary/50 animate-pulse ml-0.5 align-middle" />
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
          <div className="text-center text-muted-foreground py-10">
            <p className="text-sm">The debate arena is empty.</p>
            <p className="text-xs mt-1">Start a debate to see the discussion here.</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
