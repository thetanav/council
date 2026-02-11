import { smoothStream, streamText, tool } from "ai";
import { NextRequest } from "next/server";
import { getModel } from "@/lib/ai-providers";
import { getLLMsByIds } from "@/lib/llm-config";
import { DebateMessage, LLMParticipant, Vote } from "@/types/council";
import { z } from "zod";

export const maxDuration = 300; // 5 minutes for longer debates
export const dynamic = "force-dynamic";

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

const MAX_RETRIES = 2;
const RESPONSE_TIMEOUT = 30000; // 30 seconds timeout per response

async function streamDebateResponseWithRetry(
  participant: LLMParticipant,
  question: string,
  previousMessages: DebateMessage[],
  round: number,
  allParticipants: LLMParticipant[],
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  messageId: string,
  attempt: number = 1
): Promise<string> {
  try {
    return await Promise.race([
      streamDebateResponse(
        participant,
        question,
        previousMessages,
        round,
        allParticipants,
        controller,
        encoder,
        messageId
      ),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("Response timeout")), RESPONSE_TIMEOUT)
      ),
    ]);
  } catch (error) {
    console.error(`Debate response error for ${participant.name} (attempt ${attempt}):`, error);

    if (attempt < MAX_RETRIES) {
      sendEvent(controller, encoder, "chunk", {
        participantId: participant.id,
        messageId,
        chunk: "",
        fullText: `[Retrying... attempt ${attempt + 1}/${MAX_RETRIES}]\n\n`,
      });

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      return streamDebateResponseWithRetry(
        participant,
        question,
        previousMessages,
        round,
        allParticipants,
        controller,
        encoder,
        messageId,
        attempt + 1
      );
    }

    // Return fallback response on final failure
    const fallbackText = `[${participant.name} encountered an error and could not respond. The debate continues...]`;
    sendEvent(controller, encoder, "message-complete", {
      participantId: participant.id,
      messageId,
      content: fallbackText,
      round,
      error: true,
    });
    return fallbackText;
  }
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
    .slice(-10) // Only use last 10 messages to stay within context limits
    .map((msg) => {
      const speaker = allParticipants.find((p) => p.id === msg.participantId);
      return `${speaker?.name || "Unknown"}: ${msg.content.slice(0, 500)}`; // Limit message length
    })
    .join("\n\n");

  const systemPrompt = `You are ${participant.name}, participating in a council debate with other AI models (${otherParticipants}).

${participant.personality}

RULES:
- This is round ${round} of the debate
- Keep responses focused and concise (2-3 paragraphs max, under 400 tokens)
- You may agree, disagree, or build upon other participants' points
- Support your position with reasoning
- Be respectful but don't shy away from constructive disagreement
- Address points made by others when relevant
- IMPORTANT: Always provide a complete response. Never stop mid-sentence.`;

  const userPrompt =
    round === 1
      ? `The question for debate is: "${question}"

Please share your initial position and reasoning. Keep it concise.`
      : `The question for debate is: "${question}"

Previous discussion:
${conversationHistory}

Please respond to the discussion, addressing points made by others and refining your position. Keep it concise.`;

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
    tools: {
      search
    },
    maxOutputTokens: 400,
    temperature: 0.7,
    experimental_transform: smoothStream(),
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

const search = tool({
  inputSchema: z.object({
    query: z.string()
  }),
  execute: async ({ query }) => {
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.TAVILY_API_KEY || ""}`,
        },
        body: JSON.stringify({
          query,
          max_results: 3,
        }),
      });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      return data.results?.map((r: { title?: string; url?: string; content?: string }) => ({
        title: r.title,
        url: r.url,
        snippet: r.content,
      })) || [];
    } catch {
      return [{ title: "Search unavailable", snippet: "Could not retrieve search results." }];
    }
  }
})

async function generatePeerVoteWithRetry(
  participant: LLMParticipant,
  question: string,
  allMessages: DebateMessage[],
  allParticipants: LLMParticipant[],
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  attempt: number = 1
): Promise<Vote> {
  try {
    return await Promise.race([
      generatePeerVote(
        participant,
        question,
        allMessages,
        allParticipants,
        controller,
        encoder
      ),
      new Promise<Vote>((_, reject) =>
        setTimeout(() => reject(new Error("Vote timeout")), RESPONSE_TIMEOUT)
      ),
    ]);
  } catch (error) {
    console.error(`Vote generation error for ${participant.name} (attempt ${attempt}):`, error);

    if (attempt < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return generatePeerVoteWithRetry(
        participant,
        question,
        allMessages,
        allParticipants,
        controller,
        encoder,
        attempt + 1
      );
    }

    // Return fallback vote - randomly select another participant
    const otherParticipants = allParticipants.filter(p => p.id !== participant.id);
    const randomVote = otherParticipants[Math.floor(Math.random() * otherParticipants.length)];
    const fallbackVote: Vote = {
      participantId: participant.id,
      votedForId: randomVote?.id || otherParticipants[0]?.id || participant.id,
      position: "Error occurred during voting",
      reasoning: "The vote could not be generated after multiple attempts. Randomly assigned.",
      score: 5,
    };
    sendEvent(controller, encoder, "vote", fallbackVote);
    return fallbackVote;
  }
}

async function generatePeerVote(
  voter: LLMParticipant,
  question: string,
  allMessages: DebateMessage[],
  allParticipants: LLMParticipant[],
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
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

  sendEvent(controller, encoder, "voting", { participantId: voter.id });

  let fullText = "";

  const { textStream } = streamText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: 300,
    temperature: 0.3,
  });

  for await (const chunk of textStream) {
    fullText += chunk;
  }

  try {
    const jsonMatch = fullText.match(/\{[\s\S]*?\}/);
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

      const vote: Vote = {
        participantId: voter.id,
        votedForId: targetParticipant.id,
        position: String(parsed.position || "No position stated").slice(0, 200),
        reasoning: String(parsed.reasoning || "No reasoning provided").slice(0, 500),
        score: Math.min(10, Math.max(1, Number(parsed.score) || 5)),
      };
      sendEvent(controller, encoder, "vote", vote);
      return vote;
    }
  } catch (e) {
    console.error(`JSON parsing failed for ${voter.name}:`, e);
  }

  // Fallback: randomly assign to another participant
  const otherParticipants = allParticipants.filter(p => p.id !== voter.id);
  const randomTarget = otherParticipants[Math.floor(Math.random() * otherParticipants.length)] || otherParticipants[0];
  
  const fallbackVote: Vote = {
    participantId: voter.id,
    votedForId: randomTarget.id,
    position: fullText.slice(0, 200) || "Could not parse position",
    reasoning: "Vote parsing failed - randomly assigned",
    score: 5,
  };
  sendEvent(controller, encoder, "vote", fallbackVote);
  return fallbackVote;
}

export async function POST(req: NextRequest) {
  try {
    const body: DebateRequest = await req.json();
    const { question, participantIds, maxRounds } = body;

    if (!question?.trim()) {
      return new Response(JSON.stringify({ error: "Question is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!participantIds || participantIds.length < 2) {
      return new Response(JSON.stringify({ error: "Need at least 2 participants" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const participants = getLLMsByIds(participantIds);

    if (participants.length < 2) {
      return new Response(JSON.stringify({ error: "Could not find enough valid participants" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const encoder = createEncoder();
    let heartbeatInterval: NodeJS.Timeout | null = null;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send heartbeat every 15 seconds to keep connection alive
          heartbeatInterval = setInterval(() => {
            try {
              sendEvent(controller, encoder, "heartbeat", { timestamp: Date.now() });
            } catch {
              // Heartbeat failed, stream may be closed
            }
          }, 15000);

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
            sendEvent(controller, encoder, "round-start", { round, totalRounds: rounds });

            for (const participant of participants) {
              const messageId = `${participant.id}-${round}-${Date.now()}`;

              const response = await streamDebateResponseWithRetry(
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

            sendEvent(controller, encoder, "round-end", { round, totalRounds: rounds });
          }

          // Voting phase
          sendEvent(controller, encoder, "voting-start", { totalParticipants: participants.length });

          const votes: Vote[] = [];
          for (const participant of participants) {
            const vote = await generatePeerVoteWithRetry(
              participant,
              question,
              allMessages,
              participants,
              controller,
              encoder
            );
            votes.push(vote);
          }

          // Calculate total scores for each participant
          const scoresByParticipant = participants.map(p => {
            const votesReceived = votes.filter(v => v.votedForId === p.id);
            const totalScore = votesReceived.reduce((sum, v) => sum + v.score, 0);
            const voteCount = votesReceived.length;
            const averageScore = voteCount > 0 ? totalScore / voteCount : 0;
            return {
              participant: p,
              totalScore,
              voteCount,
              averageScore,
            };
          });

          // Calculate consensus as average of all scores (0-10 scale, convert to %)
          const avgScore = votes.reduce((sum, v) => sum + v.score, 0) / votes.length;
          const consensusPercent = (avgScore / 10) * 100;

          // Clear heartbeat before sending final event
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }

          sendEvent(controller, encoder, "debate-end", {
            consensus: consensusPercent,
            totalMessages: allMessages.length,
            totalVotes: votes.length,
            scores: scoresByParticipant.map(s => ({
              participantId: s.participant.id,
              totalScore: s.totalScore,
              voteCount: s.voteCount,
              averageScore: s.averageScore,
            })),
          });

          controller.close();
        } catch (error) {
          console.error("Stream error:", error);

          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }

          sendEvent(controller, encoder, "error", {
            message: error instanceof Error ? error.message : "Unknown error",
            code: "STREAM_ERROR",
          });
          controller.close();
        }
      },
      cancel() {
        // Clean up when client disconnects
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
        }
        console.log("Stream cancelled by client");
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx buffering
      },
    });
  } catch (error) {
    console.error("API Route error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
        code: "INTERNAL_ERROR"
      }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    }
    );
  }
}
