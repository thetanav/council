import { streamText } from "ai";
import { NextRequest } from "next/server";
import { getModel } from "@/lib/ai-providers";
import { getLLMsByIds } from "@/lib/llm-config";
import { DebateMessage, LLMParticipant } from "@/types/council";

export const maxDuration = 120;

interface DebateRequest {
  question: string;
  participantIds: string[];
  maxRounds: number;
}

function createEncoder() {
  return new TextEncoder();
}

function sendEvent(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  event: string,
  data: unknown
) {
  controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
}

async function streamDebateResponse(
  participant: LLMParticipant,
  question: string,
  previousMessages: DebateMessage[],
  round: number,
  allParticipants: LLMParticipant[],
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  messageId: string
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

  // Signal that participant is starting
  sendEvent(controller, encoder, "speaking", {
    participantId: participant.id,
    round,
    messageId,
  });

  let fullText = "";

  const { textStream } = streamText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: 500,
  });

  for await (const chunk of textStream) {
    fullText += chunk;
    sendEvent(controller, encoder, "chunk", {
      participantId: participant.id,
      messageId,
      chunk,
      fullText,
    });
  }

  // Signal message complete
  sendEvent(controller, encoder, "message-complete", {
    participantId: participant.id,
    messageId,
    content: fullText,
    round,
  });

  return fullText;
}

async function generateVote(
  participant: LLMParticipant,
  question: string,
  allMessages: DebateMessage[],
  allParticipants: LLMParticipant[],
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
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

  sendEvent(controller, encoder, "voting", { participantId: participant.id });

  let fullText = "";

  const { textStream } = streamText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: 300,
  });

  for await (const chunk of textStream) {
    fullText += chunk;
  }

  try {
    const jsonMatch = fullText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const vote = {
        participantId: participant.id,
        position: parsed.position || "No clear position",
        reasoning: parsed.reasoning || "No reasoning provided",
        confidence: Math.min(100, Math.max(0, parsed.confidence || 50)),
      };
      sendEvent(controller, encoder, "vote", vote);
      return vote;
    }
  } catch {
    // Parsing failed
  }

  const vote = {
    participantId: participant.id,
    position: fullText.slice(0, 200),
    reasoning: "Unable to parse structured response",
    confidence: 50,
  };
  sendEvent(controller, encoder, "vote", vote);
  return vote;
}

export async function POST(req: NextRequest) {
  const body: DebateRequest = await req.json();
  const { question, participantIds, maxRounds } = body;

  const participants = getLLMsByIds(participantIds);

  if (participants.length < 2) {
    return new Response(JSON.stringify({ error: "Need at least 2 participants" }), {
      status: 400,
    });
  }

  const encoder = createEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const allMessages: DebateMessage[] = [];
        const rounds = Math.min(maxRounds || 3, 5);

        sendEvent(controller, encoder, "debate-start", {
          question,
          participants: participants.map((p) => ({
            id: p.id,
            name: p.name,
            avatar: p.avatar,
            color: p.color,
          })),
          maxRounds: rounds,
        });

        // Run debate rounds
        for (let round = 1; round <= rounds; round++) {
          sendEvent(controller, encoder, "round-start", { round });

          for (const participant of participants) {
            const messageId = `${participant.id}-${round}-${Date.now()}`;

            const response = await streamDebateResponse(
              participant,
              question,
              allMessages,
              round,
              participants,
              controller,
              encoder,
              messageId
            );

            allMessages.push({
              id: messageId,
              participantId: participant.id,
              content: response,
              timestamp: new Date(),
              round,
            });
          }

          sendEvent(controller, encoder, "round-end", { round });
        }

        // Voting phase
        sendEvent(controller, encoder, "voting-start", {});

        const votes = [];
        for (const participant of participants) {
          const vote = await generateVote(
            participant,
            question,
            allMessages,
            participants,
            controller,
            encoder
          );
          votes.push(vote);
        }

        // Calculate consensus
        const avgConfidence =
          votes.reduce((sum, v) => sum + v.confidence, 0) / votes.length;

        sendEvent(controller, encoder, "debate-end", {
          consensus: avgConfidence,
          totalMessages: allMessages.length,
        });

        controller.close();
      } catch (error) {
        console.error("Stream error:", error);
        sendEvent(controller, encoder, "error", {
          message: error instanceof Error ? error.message : "Unknown error",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
