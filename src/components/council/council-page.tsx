"use client";

import { useState } from "react";
import { AVAILABLE_LLMS } from "@/lib/llm-config";
import { LLMSelector } from "@/components/council/llm-selector";
import { DebateArena } from "@/components/council/debate-arena";
import { VotingPanel } from "@/components/council/voting-panel";
import { ParticipantList } from "@/components/council/participant-list";
import { Conclusion } from "@/components/council/conclusion";
import { SentimentRadar } from "@/components/council/sentiment-radar";
import { CrossExaminationPanel } from "@/components/council/cross-examination-panel";
import { TrendingTopics } from "@/components/council/trending-topics";
import { useDebateStream } from "@/hooks/use-debate-stream";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  MessageSquare,
  Play,
  RotateCcw,
  Loader2,
  Gavel,
  Sparkles,
  AlertCircle,
  Activity,
  Users,
  Clock,
  Search,
  HelpCircle,
  ArrowRightLeft,
  Zap,
} from "lucide-react";

export function CouncilPage() {
  const [question, setQuestion] = useState("");
  const [selectedLLMs, setSelectedLLMs] = useState<string[]>([]);
  const [maxRounds, setMaxRounds] = useState("3");
  const [enableWebSearch, setEnableWebSearch] = useState(false);
  const [enableCrossExamination, setEnableCrossExamination] = useState(true);
  const [enableDevilsAdvocate, setEnableDevilsAdvocate] = useState(false);

  const {
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
    enableWebSearch: isWebSearchEnabled,
    enableCrossExamination: isCrossExamEnabled,
    startDebate,
    reset,
  } = useDebateStream();

  const handleStartDebate = async () => {
    if (!question.trim() || selectedLLMs.length < 2) return;

    const selectedParticipants = AVAILABLE_LLMS.filter((llm) =>
      selectedLLMs.includes(llm.id)
    );

    await startDebate(
      question,
      selectedLLMs,
      parseInt(maxRounds),
      selectedParticipants,
      {
        enableDevilsAdvocate,
        enableCrossExamination,
        enableWebSearch,
      }
    );
  };

  const handleReset = () => {
    reset();
    setQuestion("");
    setSelectedLLMs([]);
  };

  const handleTopicSelect = (topic: string) => {
    setQuestion(topic);
  };

  const isDebating = status === "debating" || status === "cross-examination" || status === "voting";
  const canStart =
    question.trim().length > 0 && selectedLLMs.length >= 2 && !isDebating;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/25">
              <Gavel className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Council of LLMs
              </h1>
              <p className="text-sm text-muted-foreground">
                Let AI models debate, deliberate, and vote on your questions
              </p>
            </div>
            <Badge variant="outline" className="hidden sm:flex gap-1.5">
              <Zap className="h-3 w-3" />
              <span>AI Debate Arena</span>
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-12 gap-4">
          <div className="lg:col-span-3 space-y-3">
            <Card className="lg:sticky lg:top-24">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Your Question
                </CardTitle>
                <CardDescription className="text-xs">
                  What would you like the council to debate?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="e.g., What is the best programming language for beginners in 2025?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={isDebating}
                  className="min-h-[80px] resize-none text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">Rounds</label>
                    <Select
                      value={maxRounds}
                      onValueChange={setMaxRounds}
                      disabled={isDebating}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 round</SelectItem>
                        <SelectItem value="2">2 rounds</SelectItem>
                        <SelectItem value="3">3 rounds</SelectItem>
                        <SelectItem value="4">4 rounds</SelectItem>
                        <SelectItem value="5">5 rounds</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <label className="text-xs font-medium">Advanced Options</label>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="webSearch"
                        checked={enableWebSearch}
                        onCheckedChange={(checked) => setEnableWebSearch(checked as boolean)}
                        disabled={isDebating}
                      />
                      <label htmlFor="webSearch" className="text-xs cursor-pointer flex items-center gap-1.5">
                        <Search className="h-3 w-3" />
                        Enable Web Search
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="crossExam"
                        checked={enableCrossExamination}
                        onCheckedChange={(checked) => setEnableCrossExamination(checked as boolean)}
                        disabled={isDebating}
                      />
                      <label htmlFor="crossExam" className="text-xs cursor-pointer flex items-center gap-1.5">
                        <HelpCircle className="h-3 w-3" />
                        Cross-Examination
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="devilsAdvocate"
                        checked={enableDevilsAdvocate}
                        onCheckedChange={(checked) => setEnableDevilsAdvocate(checked as boolean)}
                        disabled={isDebating}
                      />
                      <label htmlFor="devilsAdvocate" className="text-xs cursor-pointer flex items-center gap-1.5">
                        <ArrowRightLeft className="h-3 w-3" />
                        Devil&apos;s Advocate
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Select Council
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {selectedLLMs.length} selected
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Choose at least 2 AI models
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LLMSelector
                  llms={AVAILABLE_LLMS}
                  selectedIds={selectedLLMs}
                  onSelectionChange={setSelectedLLMs}
                  disabled={isDebating}
                />
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button
                onClick={handleStartDebate}
                disabled={!canStart}
                className="flex-1"
                size="default"
              >
                {isDebating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {status === "cross-examination" ? "Examining..." : status === "voting" ? "Voting..." : "Debating..."}
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Debate
                  </>
                )}
              </Button>
              {status !== "idle" && (
                <Button
                  onClick={handleReset}
                  variant="outline"
                  size="default"
                  disabled={isDebating}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>

            {error && (
              <Card className="border-destructive bg-destructive/5">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-destructive">Error</p>
                      <p className="text-xs text-destructive/80 mt-0.5">{error}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {participants.length > 0 && (
              <ParticipantList
                participants={participants}
                votes={votes}
                currentSpeaker={currentSpeaker}
                currentVoter={currentVoter}
                devilsAdvocateId={devilsAdvocateId}
              />
            )}

            <TrendingTopics onSelectTopic={handleTopicSelect} />
          </div>

          <div className="lg:col-span-9 space-y-3">
            {status !== "idle" && (
              <Card className={status === "error" ? "border-destructive" : ""}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          status === "concluded"
                            ? "default"
                            : status === "error"
                            ? "destructive"
                            : "secondary"
                        }
                        className={isDebating ? "animate-pulse" : ""}
                      >
                        {status === "debating" && (
                          <>
                            <Activity className="h-3 w-3 mr-1" />
                            Round {currentRound}
                          </>
                        )}
                        {status === "cross-examination" && (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Cross-Examination
                          </>
                        )}
                        {status === "voting" && (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Voting Phase
                          </>
                        )}
                        {status === "concluded" && (
                          <>
                            <Clock className="h-3 w-3 mr-1" />
                            Debate Concluded
                          </>
                        )}
                        {status === "error" && (
                          <>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Error
                          </>
                        )}
                      </Badge>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        <span>{messages.length} messages</span>
                        {votes.length > 0 && (
                          <>
                            <span className="mx-1">•</span>
                            <span>{votes.length} votes</span>
                          </>
                        )}
                        {crossExamQuestions.length > 0 && (
                          <>
                            <span className="mx-1">•</span>
                            <span>{crossExamQuestions.length} Q&A</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isWebSearchEnabled && (
                        <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                          <Search className="h-3 w-3 mr-1" />
                          Web Search
                        </Badge>
                      )}
                      {isCrossExamEnabled && (
                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                          <HelpCircle className="h-3 w-3 mr-1" />
                          Cross-Exam
                        </Badge>
                      )}
                      {enableDevilsAdvocate && participants.length > 0 && (
                        <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/30">
                          <ArrowRightLeft className="h-3 w-3 mr-1" />
                          Devil&apos;s Advocate
                        </Badge>
                      )}
                      {consensus !== undefined && (
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            consensus >= 70 
                              ? "border-green-500 text-green-600" 
                              : consensus >= 40 
                              ? "border-yellow-500 text-yellow-600" 
                              : "border-orange-500 text-orange-600"
                          }`}
                        >
                          Consensus: {consensus.toFixed(0)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {status !== "idle" && question && (
              <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-primary/20">
                <CardContent className="py-3">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Debating:</p>
                      <p className="font-medium text-sm">&ldquo;{question}&rdquo;</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="min-h-[500px] border-t-4 border-t-primary">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Debate Arena
                  </CardTitle>
                  {isDebating && (
                    <Badge variant="outline" className="text-[11px] animate-pulse">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse" />
                      Live
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <DebateArena
                  messages={messages}
                  participants={participants}
                  currentSpeaker={currentSpeaker}
                  streamingContent={streamingContent}
                  currentRound={currentRound}
                />
              </CardContent>
            </Card>

            {(sentiments.size > 0 || isDebating) && (
              <SentimentRadar
                sentiments={sentiments}
                participants={participants}
                currentSpeaker={currentSpeaker}
              />
            )}

            {(crossExamQuestions.length > 0 || status === "cross-examination") && (
              <>
                <Separator />
                <CrossExaminationPanel
                  questions={crossExamQuestions}
                  participants={participants}
                  currentQuestion={currentCrossExamQuestion}
                  streamingAnswer={streamingCrossExamAnswer}
                  isActive={status === "cross-examination"}
                />
              </>
            )}

            <Separator />

            <VotingPanel
              votes={votes}
              participants={participants}
              consensus={consensus}
              isVoting={status === "voting"}
              currentVoter={currentVoter}
            />

            {status === "concluded" && consensus !== undefined && (
              <>
                <Separator />
                <Conclusion
                  question={question}
                  votes={votes}
                  participants={participants}
                  consensus={consensus}
                />
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
