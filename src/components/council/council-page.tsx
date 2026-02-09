"use client";

import { useState } from "react";
import { AVAILABLE_LLMS } from "@/lib/llm-config";
import { LLMSelector } from "@/components/council/llm-selector";
import { DebateArena } from "@/components/council/debate-arena";
import { VotingPanel } from "@/components/council/voting-panel";
import { ParticipantList } from "@/components/council/participant-list";
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
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Gavel className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Council of LLMs</h1>
              <p className="text-sm text-muted-foreground">
                Let AI models debate, deliberate, and vote on your questions
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column - Setup & Participants */}
          <div className="space-y-6">
            {/* Question input */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Your Question
                </CardTitle>
                <CardDescription>
                  What would you like the council to debate?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="e.g., What is the best programming language for beginners in 2025?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={isDebating}
                  className="min-h-[100px] resize-none"
                />
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">
                      Debate Rounds
                    </label>
                    <Select
                      value={maxRounds}
                      onValueChange={setMaxRounds}
                      disabled={isDebating}
                    >
                      <SelectTrigger>
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
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Select Council Members
                  <Badge variant="secondary" className="ml-auto">
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
            <div className="flex gap-3">
              <Button
                onClick={handleStartDebate}
                disabled={!canStart}
                className="flex-1"
                size="lg"
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
                  size="lg"
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
                <CardContent className="pt-6">
                  <p className="text-sm text-destructive">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* Participant list during debate */}
            {participants.length > 0 && (
              <ParticipantList
                participants={participants}
                currentSpeaker={currentSpeaker}
                currentVoter={currentVoter}
              />
            )}
          </div>

          {/* Center column - Debate Arena */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status bar */}
            {status !== "idle" && (
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
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
                      <span className="text-sm text-muted-foreground">
                        {messages.length} messages
                      </span>
                    </div>
                    {consensus !== undefined && (
                      <Badge variant="outline">
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
                <CardContent className="py-4">
                  <p className="text-sm text-muted-foreground mb-1">
                    Debating:
                  </p>
                  <p className="font-medium">&ldquo;{question}&rdquo;</p>
                </CardContent>
              </Card>
            )}

            {/* Debate Arena */}
            <Card className="min-h-[600px]">
              <CardHeader>
                <CardTitle className="text-lg">Debate Arena</CardTitle>
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

            {/* Voting Panel */}
            <VotingPanel
              votes={votes}
              participants={participants}
              consensus={consensus}
              isVoting={status === "voting"}
              currentVoter={currentVoter}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
