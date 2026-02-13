"use client";

import { LLMParticipant, Vote } from "@/types/council";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowRightLeft } from "lucide-react";

interface ParticipantListProps {
  participants: LLMParticipant[];
  votes?: Vote[];
  currentSpeaker?: string;
  currentVoter?: string;
  devilsAdvocateId?: string;
}

export function ParticipantList({
  participants,
  votes,
  currentSpeaker,
  currentVoter,
  devilsAdvocateId,
}: ParticipantListProps) {
  if (participants.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Council Members
          <Badge variant="secondary" className="ml-auto text-xs">
            {participants.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {participants.map((participant) => {
            const isSpeaking = currentSpeaker === participant.id;
            const isVoting = currentVoter === participant.id;
            const isDevilsAdvocate = devilsAdvocateId === participant.id;
            const vote = votes?.find((item) => item.participantId === participant.id);

            return (
              <div
                key={participant.id}
                className={`flex items-center gap-2.5 p-2 rounded-md transition-colors ${
                  isSpeaking
                    ? "bg-primary/10 ring-1 ring-primary"
                    : isVoting
                    ? "bg-yellow-500/10 ring-1 ring-yellow-500"
                    : isDevilsAdvocate
                    ? "bg-red-500/10 ring-1 ring-red-500"
                    : "hover:bg-muted/50"
                }`}
              >
                <Avatar
                  className={`h-7 w-7 ${isSpeaking || isVoting ? "animate-pulse" : ""}`}
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-xs truncate">
                      {participant.name}
                    </span>
                    {isDevilsAdvocate && (
                      <Badge variant="outline" className="text-[10px] border-red-500 text-red-600 bg-red-500/10">
                        <ArrowRightLeft className="h-2.5 w-2.5 mr-1" />
                        Devil&apos;s Advocate
                      </Badge>
                    )}
                    {vote && (
                      <Badge variant="outline" className="text-[11px]">
                        Voted
                      </Badge>
                    )}
                    {isSpeaking && (
                      <Badge variant="default" className="text-[11px] animate-pulse">
                        Speaking
                      </Badge>
                    )}
                    {isVoting && (
                      <Badge
                        variant="outline"
                        className="text-[11px] animate-pulse border-yellow-500 text-yellow-600"
                      >
                        Voting
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
