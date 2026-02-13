"use client";

import { CrossExaminationQuestion, LLMParticipant } from "@/types/council";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Streamdown } from "streamdown";
import { MessageSquareQuote, MessageSquarePlus, MessageSquareText, ArrowRightLeft, HelpCircle, Bot } from "lucide-react";

interface CrossExaminationPanelProps {
  questions: CrossExaminationQuestion[];
  participants: LLMParticipant[];
  currentQuestion?: CrossExaminationQuestion;
  streamingAnswer?: string;
  isActive: boolean;
}

export function CrossExaminationPanel({
  questions,
  participants,
  currentQuestion,
  streamingAnswer,
  isActive,
}: CrossExaminationPanelProps) {
  const getParticipant = (id: string) => {
    return participants.find((p) => p.id === id);
  };

  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-amber-600" />
          Cross-Examination
          {isActive && (
            <Badge variant="secondary" className="text-[10px] animate-pulse bg-amber-500/20 text-amber-700 dark:text-amber-300">
              Live
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {questions.map((q) => {
            const asker = getParticipant(q.askerId);
            const target = getParticipant(q.targetId);
            if (!asker || !target) return null;

            return (
              <div key={q.id} className="p-3 rounded-lg border bg-background/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Avatar className="h-5 w-5" style={{ backgroundColor: asker.color }}>
                      <AvatarFallback className="text-white text-[8px]">
                        {asker.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">{asker.name}</span>
                  </div>
                  <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="flex items-center gap-1.5">
                    <Avatar className="h-5 w-5" style={{ backgroundColor: target.color }}>
                      <AvatarFallback className="text-white text-[8px]">
                        {target.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">{target.name}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <HelpCircle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-200 italic">
                      &ldquo;{q.question}&rdquo;
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Bot className="h-3.5 w-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-foreground/90">
                      <Streamdown>{q.answer}</Streamdown>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {currentQuestion && (
            <div className="p-3 rounded-lg border-2 border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/20 animate-pulse">
              {(() => {
                const asker = getParticipant(currentQuestion.askerId);
                const target = getParticipant(currentQuestion.targetId);
                if (!asker || !target) return null;

                return (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5" style={{ backgroundColor: asker.color }}>
                          <AvatarFallback className="text-white text-[8px]">
                            {asker.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">{asker.name}</span>
                      </div>
                      <ArrowRightLeft className="h-3.5 w-3.5 text-amber-600" />
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5" style={{ backgroundColor: target.color }}>
                          <AvatarFallback className="text-white text-[8px]">
                            {target.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">{target.name}</span>
                      </div>
                      <Badge variant="outline" className="ml-auto text-[10px] animate-pulse">
                        In Progress
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <HelpCircle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800 dark:text-amber-200 italic">
                          &ldquo;{currentQuestion.question}{streamingAnswer === undefined && "..."}&rdquo;
                        </p>
                      </div>
                      {streamingAnswer !== undefined && (
                        <div className="flex gap-2">
                          <Bot className="h-3.5 w-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="text-xs text-foreground/90">
                            <Streamdown>{streamingAnswer}</Streamdown>
                            <span className="inline-block w-1.5 h-3 bg-primary/50 animate-pulse ml-0.5 align-middle" />
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {questions.length === 0 && !currentQuestion && (
            <div className="text-center py-4 text-muted-foreground">
              <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">Cross-examination will begin after the debate.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
