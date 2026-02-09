"use client";

import { Vote, LLMParticipant } from "@/types/council";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, TrendingUp } from "lucide-react";

interface VotingPanelProps {
  votes: Vote[];
  participants: LLMParticipant[];
  consensus?: number;
  isVoting?: boolean;
  currentVoter?: string;
}

export function VotingPanel({
  votes,
  participants,
  consensus,
  isVoting,
  currentVoter,
}: VotingPanelProps) {
  const getParticipant = (id: string) => {
    return participants.find((p) => p.id === id);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-600";
    if (confidence >= 60) return "text-yellow-600";
    return "text-orange-600";
  };

  const getConsensusLabel = (consensus: number) => {
    if (consensus >= 80) return { label: "Strong Consensus", color: "bg-green-500" };
    if (consensus >= 60) return { label: "Moderate Consensus", color: "bg-yellow-500" };
    if (consensus >= 40) return { label: "Mixed Views", color: "bg-orange-500" };
    return { label: "Low Consensus", color: "bg-red-500" };
  };

  if (votes.length === 0 && !isVoting) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          Council Votes
          {isVoting && (
            <Badge variant="secondary" className="animate-pulse ml-2">
              Voting in progress...
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Consensus meter */}
        {consensus !== undefined && votes.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                Consensus Level
              </span>
              <Badge className={getConsensusLabel(consensus).color}>
                {getConsensusLabel(consensus).label}
              </Badge>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${consensus}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Average confidence: {consensus.toFixed(0)}%
            </p>
          </div>
        )}

        {votes.length > 0 && <Separator />}

        {/* Individual votes */}
        <div className="space-y-3">
          {votes.map((vote) => {
            const participant = getParticipant(vote.participantId);
            if (!participant) return null;

            return (
              <div
                key={vote.participantId}
                className="p-3 rounded-lg bg-muted/50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar
                      className="h-6 w-6"
                      style={{ backgroundColor: participant.color }}
                    >
                      <AvatarFallback
                        className="text-white text-xs"
                        style={{ backgroundColor: participant.color }}
                      >
                        {participant.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm">{participant.name}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={getConfidenceColor(vote.confidence)}
                  >
                    {vote.confidence}% confident
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{vote.position}</p>
                  <p className="text-xs text-muted-foreground">{vote.reasoning}</p>
                </div>
              </div>
            );
          })}

          {/* Pending voters */}
          {isVoting &&
            participants
              .filter((p) => !votes.find((v) => v.participantId === p.id))
              .map((participant) => (
                <div
                  key={participant.id}
                  className={`p-3 rounded-lg bg-muted/30 border border-dashed ${
                    currentVoter === participant.id ? "border-primary" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Avatar
                      className={`h-6 w-6 ${
                        currentVoter === participant.id ? "animate-pulse" : "opacity-50"
                      }`}
                      style={{ backgroundColor: participant.color }}
                    >
                      <AvatarFallback
                        className="text-white text-xs"
                        style={{ backgroundColor: participant.color }}
                      >
                        {participant.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm text-muted-foreground">
                      {participant.name}
                    </span>
                    {currentVoter === participant.id && (
                      <Badge variant="secondary" className="text-xs animate-pulse">
                        Deliberating...
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
        </div>
      </CardContent>
    </Card>
  );
}
