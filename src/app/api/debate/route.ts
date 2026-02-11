import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { getModel } from "@/lib/ai-providers";
import { getLLMsByIds } from "@/lib/llm-config";
import { DebateMessage, Vote, LLMParticipant } from "@/types/council";

export const maxDuration = 60;

interface DebateRequest {
  question: string;
  participantIds: string[];
  maxRounds: number;
}

interface DebateResponse {
  messages: DebateMessage[];
  votes: Vote[];
  finalAnswer: string;
  consensus: number;
}

async function generateDebateResponse(
  participant: LLMParticipant,
  question: string,
  previousMessages: DebateMessage[],
  round: number,
  allParticipants: LLMParticipant[]
): Promise<string> {
  const otherParticipants = allParticipants
    .filter((p) => p.id !== participant.id)
    .map((p) => p.name)
    .join(", ");

  const conversationHistory = previousMessages
    .slice(-10)
    .map((msg) => {
      const speaker = allParticipants.find((p) => p.id === msg.participantId);
      return `${speaker?.name || "Unknown"}: ${msg.content.slice(0, 500)}`;
    })
    .join("\n\n");

  const systemPrompt = `You are ${participant.name}, participating in a council debate with other AI models (${otherParticipants}).

${participant.personality}

RULES:
- This is round ${round} of the debate
- Keep responses focused and concise (2-4 paragraphs max, under 500 tokens)
- You may agree, disagree, or build upon other participants' points
- Support your position with reasoning
- Be respectful but don't shy away from constructive disagreement
- Address points made by others when relevant`;

  const userPrompt =
    round === 1
      ? `The question for debate is: "${question}"

Please share your initial position and reasoning. Keep it concise.`
      : `The question for debate is: "${question}"

Previous discussion:
${conversationHistory}

Please respond to the discussion, addressing points made by others and refining your position.`;

  const model = getModel(participant.provider, participant.model);

  const { text } = await generateText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: 500,
  });

  return text;
}

async function generatePeerVote(
  voter: LLMParticipant,
  question: string,
  allMessages: DebateMessage[],
  allParticipants: LLMParticipant[]
): Promise<Vote> {
  // Get messages grouped by participant
  const messagesByParticipant = allParticipants.map(p => {
    const participantMessages = allMessages
      .filter(m => m.participantId === p.id)
      .map(m => m.content.slice(0, 300))
      .join("\n\n");
    return {
      participant: p,
      messages: participantMessages,
    };
  });

  // Build a summary of each participant's arguments
  const participantSummaries = messagesByParticipant
    .filter(({ participant }) => participant.id !== voter.id)
    .map(({ participant, messages }) =>
      `**${participant.name}** (${participant.avatar}):
${messages || "[No substantial contribution]"}`
    )
    .join("\n\n---\n\n");

  const systemPrompt = `You are ${voter.name}, an impartial judge evaluating a debate.

${voter.personality}

Your task is to vote for the participant (other than yourself) who made the BEST argument in this debate.

You must respond in the following JSON format ONLY (no other text):
{
  "votedFor": "name of the participant you're voting for",
  "position": "The position/answer they advocated for",
  "reasoning": "Why their argument was the best (2-3 sentences)",
  "score": <number 1-10 representing how convincing their argument was>
}

Rules:
- You CANNOT vote for yourself (${voter.name})
- Score from 1-10 (10 = most convincing)
- Consider: logic, evidence, clarity, and persuasiveness
- Be objective and fair in your evaluation

IMPORTANT: Return ONLY valid JSON. No markdown, no extra text.`;

  const userPrompt = `The debate question: "${question}"

Arguments from each participant:

${participantSummaries}

Evaluate all arguments and vote for who made the best case. Return your vote in the specified JSON format.`;

  const model = getModel(voter.provider, voter.model);

  const { text } = await generateText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: 300,
    temperature: 0.3,
  });

  try {
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Find the participant they voted for by name
      const votedForName = String(parsed.votedFor || "").toLowerCase();
      const votedForParticipant = allParticipants.find(
        p => p.id !== voter.id &&
        (p.name.toLowerCase() === votedForName ||
         p.name.toLowerCase().includes(votedForName) ||
         votedForName.includes(p.name.toLowerCase()))
      );

      // Default to first other participant if parsing fails
      const fallbackParticipant = allParticipants.find(p => p.id !== voter.id);
      const targetParticipant = votedForParticipant || fallbackParticipant;

      if (!targetParticipant) {
        throw new Error("Could not determine vote target");
      }

      return {
        participantId: voter.id,
        votedForId: targetParticipant.id,
        position: String(parsed.position || "No position stated").slice(0, 200),
        reasoning: String(parsed.reasoning || "No reasoning provided").slice(0, 500),
        score: Math.min(10, Math.max(1, Number(parsed.score) || 5)),
      };
    }
  } catch (e) {
    console.error(`JSON parsing failed for ${voter.name}:`, e);
  }

  // Fallback: randomly assign to another participant
  const otherParticipants = allParticipants.filter(p => p.id !== voter.id);
  const randomTarget = otherParticipants[Math.floor(Math.random() * otherParticipants.length)] || otherParticipants[0];

  return {
    participantId: voter.id,
    votedForId: randomTarget.id,
    position: text.slice(0, 200) || "Could not parse position",
    reasoning: "Vote parsing failed - randomly assigned",
    score: 5,
  };
}

function synthesizeFinalAnswer(
  question: string,
  votes: Vote[],
  participants: LLMParticipant[]
): { answer: string; consensus: number } {
  // Calculate scores by participant
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

  const winner = scoresByParticipant[0];
  const avgScore = votes.reduce((sum, v) => sum + v.score, 0) / votes.length;

  const voteSummary = scoresByParticipant.map((s) => {
    return `**${s.participant.name}**: ${s.voteCount} votes, ${s.totalScore} total score`;
  });

  const answer = `## Council Conclusion

After deliberation on: "${question}"

### Winner: ${winner.participant.name}
${winner.participant.name} received ${winner.voteCount} votes with a total score of ${winner.totalScore}.

### Vote Distribution:
${voteSummary.join("\n")}

### Summary:
The council evaluated each other's arguments with an average quality score of ${avgScore.toFixed(1)}/10.`;

  // Convert 0-10 scale to percentage
  return { answer, consensus: (avgScore / 10) * 100 };
}

export async function POST(req: NextRequest) {
  try {
    const body: DebateRequest = await req.json();
    const { question, participantIds, maxRounds } = body;

    if (!question || !participantIds || participantIds.length < 2) {
      return NextResponse.json(
        { error: "Invalid request. Need a question and at least 2 participants." },
        { status: 400 }
      );
    }

    const participants = getLLMsByIds(participantIds);

    if (participants.length < 2) {
      return NextResponse.json(
        { error: "Could not find enough valid participants." },
        { status: 400 }
      );
    }

    const allMessages: DebateMessage[] = [];
    const rounds = Math.min(maxRounds || 3, 5);

    // Run debate rounds
    for (let round = 1; round <= rounds; round++) {
      for (const participant of participants) {
        const response = await generateDebateResponse(
          participant,
          question,
          allMessages,
          round,
          participants
        );

        allMessages.push({
          id: `${participant.id}-${round}-${Date.now()}`,
          participantId: participant.id,
          content: response,
          timestamp: new Date(),
          round,
        });
      }
    }

    // Collect peer votes
    const votes: Vote[] = await Promise.all(
      participants.map((p) => generatePeerVote(p, question, allMessages, participants))
    );

    // Synthesize final answer
    const { answer, consensus } = synthesizeFinalAnswer(question, votes, participants);

    const response: DebateResponse = {
      messages: allMessages,
      votes,
      finalAnswer: answer,
      consensus,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Debate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run debate" },
      { status: 500 }
    );
  }
}
