"use client";

import { SentimentData, SentimentType, LLMParticipant } from "@/types/council";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  SmilePlus, 
  Angry, 
  Gauge, 
  Search, 
  MessageSquare,
  Sparkles
} from "lucide-react";

interface SentimentRadarProps {
  sentiments: Map<string, SentimentData>;
  participants: LLMParticipant[];
  currentSpeaker?: string;
}

const SENTIMENT_ICONS: Record<SentimentType, React.ReactNode> = {
  joy: <SmilePlus className="h-3.5 w-3.5 text-yellow-500" />,
  anger: <Angry className="h-3.5 w-3.5 text-red-500" />,
  confidence: <Gauge className="h-3.5 w-3.5 text-blue-500" />,
  curiosity: <Search className="h-3.5 w-3.5 text-purple-500" />,
  neutral: <MessageSquare className="h-3.5 w-3.5 text-gray-400" />,
};

const SENTIMENT_LABELS: Record<SentimentType, string> = {
  joy: "Joy",
  anger: "Anger",
  confidence: "Confidence",
  curiosity: "Curiosity",
  neutral: "Neutral",
};

const SENTIMENT_COLORS: Record<SentimentType, string> = {
  joy: "bg-yellow-500",
  anger: "bg-red-500",
  confidence: "bg-blue-500",
  curiosity: "bg-purple-500",
  neutral: "bg-gray-400",
};

export function SentimentRadar({ sentiments, participants, currentSpeaker }: SentimentRadarProps) {
  if (sentiments.size === 0) {
    return null;
  }

  return (
    <Card className="mt-3">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Sentiment Radar
          <Badge variant="secondary" className="ml-auto text-xs">
            Live
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2">
          {participants.map((participant) => {
            const sentiment = sentiments.get(participant.id);
            if (!sentiment) return null;

            const isSpeaking = currentSpeaker === participant.id;

            return (
              <div
                key={participant.id}
                className={`p-2 rounded-lg border transition-all ${
                  isSpeaking ? "bg-primary/10 border-primary" : "bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Avatar
                    className="h-6 w-6"
                    style={{ backgroundColor: participant.color }}
                  >
                    <AvatarFallback className="text-white text-[10px]">
                      {participant.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium">{participant.name}</span>
                  {isSpeaking && (
                    <Badge variant="default" className="text-[10px] ml-auto animate-pulse">
                      Speaking
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {(Object.keys(sentiment.sentiments) as SentimentType[]).map((type) => (
                    <div key={type} className="text-center">
                      <div className="relative h-8 w-full mb-1">
                        <div className="absolute inset-0 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`absolute bottom-0 left-0 right-0 transition-all duration-500 ${SENTIMENT_COLORS[type]}`}
                            style={{
                              height: `${(sentiment.sentiments[type] || 0) * 100}%`,
                            }}
                          />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          {SENTIMENT_ICONS[type]}
                        </div>
                      </div>
                      <span className="text-[9px] text-muted-foreground">
                        {SENTIMENT_LABELS[type]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
