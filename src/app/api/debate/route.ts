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
    .map((msg) => {
      const speaker = allParticipants.find((p) => p.id === msg.participantId);
      return `${speaker?.name || "Unknown"}: ${msg.content}`;
    })
    .join("\n\n");

  const systemPrompt = `You are ${participant.name}, participating in a council debate with other AI models (${otherParticipants}).

${participant.personality}

RULES:
- This is round ${round} of the debate
- Keep responses focused and concise (2-4 paragraphs max)
- You may agree, disagree, or build upon other participants' points
- Support your position with reasoning
- Be respectful but don't shy away from constructive disagreement
- Address points made by others when relevant`;

  const userPrompt =
    round === 1
      ? `The question for debate is: "${question}"

Please share your initial position and reasoning.`
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

async function generateVote(
  participant: LLMParticipant,
  question: string,
  allMessages: DebateMessage[],
  allParticipants: LLMParticipant[]
): Promise<Vote> {
  const conversationHistory = allMessages
    .map((msg) => {
      const speaker = allParticipants.find((p) => p.id === msg.participantId);
      return `${speaker?.name || "Unknown"}: ${msg.content}`;
    })
    .join("\n\n");

  const systemPrompt = `You are ${participant.name}. After a thorough debate, you must now cast your final vote on the question.

${participant.personality}

You must respond in the following JSON format ONLY (no other text):
{
  "position": "Your final answer/position in one sentence",
  "reasoning": "Brief explanation of why you reached this conclusion (2-3 sentences)",
  "confidence": <number between 0 and 100 representing your confidence percentage>
}`;

  const userPrompt = `The question was: "${question}"

The full debate:
${conversationHistory}

Now cast your final vote with your position, reasoning, and confidence level.`;

  const model = getModel(participant.provider, participant.model);

  const { text } = await generateText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: 300,
  });

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        participantId: participant.id,
        position: parsed.position || "No clear position",
        reasoning: parsed.reasoning || "No reasoning provided",
        confidence: Math.min(100, Math.max(0, parsed.confidence || 50)),
      };
    }
  } catch {
    // Parsing failed, return default
  }

  return {
    participantId: participant.id,
    position: text.slice(0, 200),
    reasoning: "Unable to parse structured response",
    confidence: 50,
  };
}

function synthesizeFinalAnswer(
  question: string,
  votes: Vote[],
  participants: LLMParticipant[]
): { answer: string; consensus: number } {
  const avgConfidence =
    votes.reduce((sum, v) => sum + v.confidence, 0) / votes.length;

  const positions = votes.map((v) => {
    const participant = participants.find((p) => p.id === v.participantId);
    return `**${participant?.name}** (${v.confidence}% confident): ${v.position}`;
  });

  const answer = `## Council Conclusion

After deliberation on: "${question}"

### Individual Positions:
${positions.join("\n\n")}

### Summary:
The council has reached their conclusions with an average confidence of ${avgConfidence.toFixed(0)}%.`;

  return { answer, consensus: avgConfidence };
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

    // Collect votes
    const votes: Vote[] = await Promise.all(
      participants.map((p) => generateVote(p, question, allMessages, participants))
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
