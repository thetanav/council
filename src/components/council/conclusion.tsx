"use client";

import { Streamdown } from "streamdown";
import { Vote, LLMParticipant } from "@/types/council";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, CheckCircle2, TrendingUp, Crown, Star, Users } from "lucide-react";

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

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 5) return "text-yellow-600";
    return "text-orange-600";
  };

  const getConsensusLabel = (consensus: number) => {
    if (consensus >= 80) return { label: "Strong Consensus", color: "bg-green-500" };
    if (consensus >= 60) return { label: "Moderate Consensus", color: "bg-yellow-500" };
    if (consensus >= 40) return { label: "Mixed Views", color: "bg-orange-500" };
    return { label: "Low Consensus", color: "bg-red-500" };
  };

  const consensusInfo = getConsensusLabel(consensus);

  // Calculate scores by summing all votes received by each participant
  const scoresByParticipant = participants.map(p => {
    const votesReceived = votes.filter(v => v.votedForId === p.id);
    const totalScore = votesReceived.reduce((sum, v) => sum + v.score, 0);
    const voteCount = votesReceived.length;
    return {
      participant: p,
      totalScore,
      voteCount,
    };
  }).sort((a, b) => b.totalScore - a.totalScore);

  // Winner is the participant with highest total score
  const winnerData = scoresByParticipant[0];
  const winner = winnerData?.participant;

  // Calculate vote distribution
  const voteDistribution = scoresByParticipant.map(({ participant, voteCount, totalScore }) => ({
    participant,
    voteCount,
    totalScore,
    percentage: votes.length > 0 ? (voteCount / votes.length) * 100 : 0,
  }));

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
          <p className="font-medium text-sm">&ldquo;{question}&rdquo;</p>
        </div>

        {/* Consensus Summary */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="font-medium text-sm">Debate Quality</span>
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
            Average argument quality: {(consensus / 10).toFixed(1)}/10
          </p>
        </div>

        {/* Winner Announcement */}
        {winner && (
          <div className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 rounded-lg border-2 border-amber-400 dark:border-amber-600">
            <div className="flex items-center gap-3 mb-3">
              <Crown className="h-6 w-6 text-amber-500" />
              <span className="font-bold text-lg">Winner</span>
              <Badge className="ml-auto bg-amber-500 text-white text-[11px]">
                {winnerData.voteCount} votes
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Avatar
                className="h-12 w-12 ring-2 ring-amber-400"
                style={{ backgroundColor: winner.color }}
              >
                <AvatarFallback
                  className="text-white text-lg font-bold"
                  style={{ backgroundColor: winner.color }}
                >
                  {winner.avatar}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-bold text-base">{winner.name}</p>
                <p className="text-sm text-muted-foreground">
                  Total Score: {winnerData.totalScore} points
                </p>
              </div>
            </div>
            {/* Winner's position from votes they received */}
            {votes.find(v => v.votedForId === winner.id) && (
              <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800">
                <p className="text-xs text-muted-foreground mb-1">Winning Position:</p>
                <p className="text-sm font-medium">
                  {votes.find(v => v.votedForId === winner.id)?.position}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Vote Distribution */}
        <div className="p-3 bg-primary/10 rounded-md border border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Vote Distribution</span>
          </div>
          <div className="space-y-2">
            {voteDistribution.map(({ participant, voteCount, totalScore }) => (
              <div key={participant.id} className="flex items-center gap-2">
                <Avatar
                  className="h-5 w-5"
                  style={{ backgroundColor: participant.color }}
                >
                  <AvatarFallback className="text-white text-[9px]">
                    {participant.avatar}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs flex-1">{participant.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${votes.length > 0 ? (voteCount / votes.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {voteCount} vote{voteCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Individual Votes - Now shows who voted for whom */}
        <div>
          <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4" />
            Peer Votes
          </h3>
          <ScrollArea className="h-[260px]">
            <div className="space-y-2">
              {votes.map((vote) => {
                const voter = getParticipant(vote.participantId);
                const votedFor = getParticipant(vote.votedForId);
                const isWinnerVote = vote.votedForId === winner?.id;
                if (!voter || !votedFor) return null;

                return (
                  <div
                    key={vote.participantId}
                    className={`p-3 rounded-md border ${isWinnerVote ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700' : 'bg-muted/50'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar
                          className="h-6 w-6"
                          style={{ backgroundColor: voter.color }}
                        >
                          <AvatarFallback
                            className="text-white text-[10px]"
                            style={{ backgroundColor: voter.color }}
                          >
                            {voter.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-xs">{voter.name}</span>
                        <span className="text-xs text-muted-foreground">voted for</span>
                        <Avatar
                          className="h-5 w-5"
                          style={{ backgroundColor: votedFor.color }}
                        >
                          <AvatarFallback
                            className="text-white text-[9px]"
                            style={{ backgroundColor: votedFor.color }}
                          >
                            {votedFor.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-xs">{votedFor.name}</span>
                        {isWinnerVote && (
                          <Badge className="bg-amber-500 text-white text-[10px]">
                            <Crown className="h-3 w-3 mr-1" />
                            Winner
                          </Badge>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={`${getScoreColor(vote.score)} text-[11px]`}
                      >
                        Score: {vote.score}/10
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Position:</span> {vote.position}
                      </p>
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

        {/* Final Conclusion Summary */}
        <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-5 w-5 text-primary" />
            <span className="font-bold text-base">Final Conclusion</span>
          </div>
          <div className="space-y-2 text-sm">
            <p>
              After {votes.length} participants debated, each voted for the best argument from their peers.
            </p>
            <p className="text-muted-foreground">
              <strong>{winner?.name}</strong> emerged as the winner with <strong>{winnerData?.voteCount} votes</strong> and a total score of <strong>{winnerData?.totalScore} points</strong>.
            </p>
            <p className="text-muted-foreground">
              The debate quality was <strong>{consensusInfo.label.toLowerCase()}</strong> with an average argument score of <strong>{(consensus / 10).toFixed(1)}/10</strong>.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
