"use client";

import { Streamdown } from "streamdown";
import { Vote, LLMParticipant } from "@/types/council";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, CheckCircle2, TrendingUp } from "lucide-react";

interface ConclusionProps {
  question: string;
  votes: Vote[];
  participants: LLMParticipant[];
  consensus: number;
}

export function Conclusion({ question, votes, participants, consensus }: ConclusionProps) {
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

  const consensusInfo = getConsensusLabel(consensus);

  const positionCounts = votes.reduce((acc, vote) => {
    const key = vote.position.toLowerCase();
    if (!acc[key]) {
      acc[key] = { count: 0, sample: vote.position };
    }
    acc[key].count += 1;
    return acc;
  }, {} as Record<string, { count: number; sample: string }>);

  const majorityPosition = Object.entries(positionCounts)
    .sort((a, b) => b[1].count - a[1].count)[0];

  const majorityText = majorityPosition
    ? `${majorityPosition[1].count} of ${votes.length} models agree`
    : "No clear majority";

  const majorityPositionText =
    majorityPosition?.[1].sample ?? "the question remains open";
  const actionSteps = [
    "Identify the highest-impact constraint and validate it with a small test.",
    "Run a quick comparison on the top two options against the success criteria.",
    "Make a time-boxed decision and document assumptions for a follow-up review.",
  ];

  const recommendedAction = votes.length
    ? votes.reduce((best, vote) => (vote.confidence > best.confidence ? vote : best), votes[0])
        .position
    : "Define the next best action.";

  return (
    <Card className="border-primary">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Council Conclusion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Question */}
        <div className="p-3 bg-muted rounded-md">
          <p className="text-xs text-muted-foreground mb-1">Question:</p>
          <p className="font-medium text-sm">"{question}"</p>
        </div>

        {/* Consensus Summary */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="font-medium text-sm">Consensus Level</span>
            </div>
            <Badge className={`${consensusInfo.color} text-[11px]`}>
              {consensusInfo.label}
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

        {/* Majority View */}
        <div className="p-3 bg-primary/10 rounded-md border border-primary/20">
          <div className="flex items-center gap-2 mb-1.5">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Majority View</span>
            <Badge variant="outline" className="ml-auto text-[11px]">
              {majorityText}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            The council leans toward {majorityPositionText}.
          </p>
        </div>

        {/* Recommended Action */}
        <div className="p-3 bg-muted/50 rounded-md border">
          <div className="flex items-center gap-2 mb-1.5">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-semibold text-sm">Recommended Action</span>
            <Badge variant="secondary" className="ml-auto text-[11px]">
              Highest confidence
            </Badge>
          </div>
          <p className="text-sm text-foreground">{recommendedAction}</p>
          <div className="mt-2 space-y-1">
            {actionSteps.map((step) => (
              <p key={step} className="text-xs text-muted-foreground">
                {step}
              </p>
            ))}
          </div>
        </div>

        {/* Individual Votes */}
        <div>
          <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4" />
            Individual Votes
          </h3>
          <ScrollArea className="h-[260px]">
            <div className="space-y-2">
              {votes.map((vote) => {
                const participant = getParticipant(vote.participantId);
                if (!participant) return null;

                return (
                  <div
                    key={vote.participantId}
                    className="p-3 rounded-md bg-muted/50 border"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar
                          className="h-6 w-6"
                          style={{ backgroundColor: participant.color }}
                        >
                          <AvatarFallback
                            className="text-white text-[10px]"
                            style={{ backgroundColor: participant.color }}
                          >
                            {participant.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-xs">{participant.name}</span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`${getConfidenceColor(vote.confidence)} text-[11px]`}
                      >
                        {vote.confidence}% confident
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium text-xs">{vote.position}</p>
                      <div className="text-[11px] text-muted-foreground prose prose-xs dark:prose-invert max-w-none [&_p]:mb-1 [&_p:last-child]:mb-0">
                        <Streamdown>{vote.reasoning}</Streamdown>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
