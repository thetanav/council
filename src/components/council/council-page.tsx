"use client";

import { useState } from "react";
import { AVAILABLE_LLMS } from "@/lib/llm-config";
import { LLMSelector } from "@/components/council/llm-selector";
import { DebateArena } from "@/components/council/debate-arena";
import { VotingPanel } from "@/components/council/voting-panel";
import { ParticipantList } from "@/components/council/participant-list";
import { Conclusion } from "@/components/council/conclusion";
import { useDebateStream } from "@/hooks/use-debate-stream";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
} from "lucide-react";

export function CouncilPage() {
  const [question, setQuestion] = useState("");
  const [selectedLLMs, setSelectedLLMs] = useState<string[]>([]);
  const [maxRounds, setMaxRounds] = useState("3");

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
      selectedParticipants
    );
  };

  const handleReset = () => {
    reset();
    setQuestion("");
    setSelectedLLMs([]);
  };

  const isDebating = status === "debating" || status === "voting";
  const canStart =
    question.trim().length > 0 && selectedLLMs.length >= 2 && !isDebating;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Gavel className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Council of LLMs</h1>
              <p className="text-xs text-muted-foreground">
                Let AI models debate, deliberate, and vote on your questions
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-3">
          {/* Left column - Setup & Participants */}
          <div className="space-y-3">
            {/* Question input */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Your Question
                </CardTitle>
                <CardDescription>
                  What would you like the council to debate?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="e.g., What is the best programming language for beginners in 2025?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={isDebating}
                  className="min-h-[84px] resize-none text-sm"
                />
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-medium mb-1.5 block">
                      Debate Rounds
                    </label>
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
              </CardContent>
            </Card>

            {/* LLM Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Select Council Members
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {selectedLLMs.length} selected
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Choose at least 2 AI models to participate in the debate
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

            {/* Action buttons */}
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
                    {status === "voting" ? "Voting..." : "Debating..."}
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
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              )}
            </div>

            {/* Error display */}
            {error && (
              <Card className="border-destructive">
                <CardContent className="pt-4">
                  <p className="text-xs text-destructive">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* Participant list during debate */}
            {participants.length > 0 && (
              <ParticipantList
                participants={participants}
                votes={votes}
                currentSpeaker={currentSpeaker}
                currentVoter={currentVoter}
              />
            )}
          </div>

          {/* Center column - Debate Arena */}
          <div className="lg:col-span-2 space-y-3">
            {/* Status bar */}
            {status !== "idle" && (
              <Card>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          status === "concluded"
                            ? "default"
                            : status === "error"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {status === "debating" && `Round ${currentRound}`}
                        {status === "voting" && "Voting Phase"}
                        {status === "concluded" && "Debate Concluded"}
                        {status === "error" && "Error"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {messages.length} messages
                      </span>
                    </div>
                    {consensus !== undefined && (
                      <Badge variant="outline" className="text-xs">
                        Consensus: {consensus.toFixed(0)}%
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Question display */}
            {status !== "idle" && question && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="py-3">
                  <p className="text-xs text-muted-foreground mb-1">Debating:</p>
                  <p className="font-medium text-sm">"{question}"</p>
                </CardContent>
              </Card>
            )}

            {/* Debate Arena */}
            <Card className="min-h-[520px]">
              <CardHeader>
                <CardTitle className="text-base">Debate Arena</CardTitle>
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

            <Separator />

            {/* Voting Panel - show during voting and after */}
            {(votes.length > 0 || status === "voting") && (
              <VotingPanel
                votes={votes}
                participants={participants}
                consensus={consensus}
                isVoting={status === "voting"}
                currentVoter={currentVoter}
              />
            )}

            {/* Conclusion - show only when concluded */}
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
