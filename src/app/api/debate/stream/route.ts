import { smoothStream, streamText, tool } from "ai";
import { NextRequest } from "next/server";
import { getModel, supportsTools } from "@/lib/ai-providers";
import { getLLMsByIds } from "@/lib/llm-config";
import { DebateMessage, LLMParticipant, Vote, CrossExaminationQuestion, SentimentType } from "@/types/council";
import { z } from "zod";

export const maxDuration = 600;
export const dynamic = "force-dynamic";

interface DebateRequest {
  question: string;
  participantIds: string[];
  maxRounds: number;
  enableDevilsAdvocate?: boolean;
  enableCrossExamination?: boolean;
  enableWebSearch?: boolean;
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
const RESPONSE_TIMEOUT = 30000;

async function analyzeSentiment(text: string): Promise<Record<SentimentType, number>> {
  const positiveWords = ['agree', 'good', 'excellent', 'correct', 'right', 'love', 'great', 'perfect', 'best', 'winning', 'convincing', 'strong', 'clear', 'sound'];
  const negativeWords = ['wrong', 'bad', 'disagree', 'poor', 'fail', 'incorrect', 'weak', 'flawed', 'mistake', 'error', 'lose', 'losing'];
  const confidentWords = ['certain', 'definitely', 'absolutely', 'clearly', 'obviously', 'must', 'will', 'proven', 'fact'];
  const curiousWords = ['wonder', 'think', 'maybe', 'perhaps', 'could', 'might', 'should', 'consider', 'explore', 'question'];
  
  const lowerText = text.toLowerCase();
  
  let joy = 0.1, anger = 0.1, confidence = 0.2, curiosity = 0.3, neutral = 0.3;
  
  positiveWords.forEach(w => { if (lowerText.includes(w)) joy += 0.15; });
  negativeWords.forEach(w => { if (lowerText.includes(w)) anger += 0.15; });
  confidentWords.forEach(w => { if (lowerText.includes(w)) confidence += 0.12; });
  curiousWords.forEach(w => { if (lowerText.includes(w)) curiosity += 0.1; });
  
  const total = joy + anger + confidence + curiosity + neutral;
  return {
    joy: Math.min(1, joy / total),
    anger: Math.min(1, anger / total),
    confidence: Math.min(1, confidence / total),
    curiosity: Math.min(1, curiosity / total),
    neutral: Math.max(0.1, 1 - (joy + anger + confidence + curiosity))
  };
}

const search = tool({
  inputSchema: z.object({
    query: z.string()
  }),
  execute: async ({ query }) => {
    if (!process.env.TAVILY_API_KEY) {
      return [{ title: "Search unavailable", snippet: "No API key configured. Please add TAVILY_API_KEY to your environment." }];
    }
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.TAVILY_API_KEY}`,
        },
        body: JSON.stringify({
          query,
          max_results: 5,
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
});

async function streamDebateResponseWithRetry(
  participant: LLMParticipant,
  question: string,
  previousMessages: DebateMessage[],
  round: number,
  allParticipants: LLMParticipant[],
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  messageId: string,
  attempt: number = 1,
  enableWebSearch?: boolean,
  enableDevilsAdvocate?: boolean
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
        messageId,
        enableWebSearch,
        enableDevilsAdvocate
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
        attempt + 1,
        enableWebSearch,
        enableDevilsAdvocate
      );
    }

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
  messageId: string,
  enableWebSearch?: boolean,
  enableDevilsAdvocate?: boolean
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

  let devilsAdvocateNote = "";
  if (enableDevilsAdvocate && round > 1) {
    devilsAdvocateNote = `\n\nIMPORTANT: You have been selected as the DEVIL'S ADVOCATE this round. Your job is to take the OPPOSITE position from what you believe. Challenge the consensus, find flaws in arguments, and argue against the most popular viewpoint. Be provocative but constructive.`;
  }

  const systemPrompt = `You are ${participant.name}, participating in a council debate with other AI models (${otherParticipants}).

${participant.personality}

RULES:
- This is round ${round} of the debate
- Keep responses focused and concise (2-3 paragraphs max, under 400 tokens)
- You may agree, disagree, or build upon other participants' points
- Support your position with reasoning
- Be respectful but don't shy away from constructive disagreement
- Address points made by others when relevant
- IMPORTANT: Always provide a complete response. Never stop mid-sentence.${devilsAdvocateNote}`;

  const userPrompt =
    round === 1
      ? `The question for debate is: "${question}"

Please share your initial position and reasoning. Keep it concise.`
      : `The question for debate is: "${question}"

Previous discussion:
${conversationHistory}

Please respond to the discussion, addressing points made by others and refining your position. Keep it concise.`;

  const model = getModel(participant.provider, participant.model);

  const modelCanUseTools = enableWebSearch && supportsTools(participant.provider, participant.model);

  sendEvent(controller, encoder, "speaking", {
    participantId: participant.id,
    round,
    messageId,
  });

  let fullText = "";

  const modelOptions: Parameters<typeof streamText>[0] = {
    model,
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: 400,
    temperature: 0.7,
    experimental_transform: smoothStream(),
  };

  if (modelCanUseTools) {
    modelOptions.tools = { search };
  }

  const { textStream } = streamText(modelOptions);

  for await (const chunk of textStream) {
    fullText += chunk;
    sendEvent(controller, encoder, "chunk", {
      participantId: participant.id,
      messageId,
      chunk,
      fullText,
    });
  }

  const sentiment = await analyzeSentiment(fullText);
  sendEvent(controller, encoder, "sentiment", {
    participantId: participant.id,
    messageId,
    sentiment
  });

  sendEvent(controller, encoder, "message-complete", {
    participantId: participant.id,
    messageId,
    content: fullText,
    round,
  });

  return fullText;
}

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
      
      const votedForName = String(parsed.votedFor || "").toLowerCase();
      const votedForParticipant = allParticipants.find(
        p => p.id !== voter.id && 
        (p.name.toLowerCase() === votedForName || 
         p.name.toLowerCase().includes(votedForName) ||
         votedForName.includes(p.name.toLowerCase()))
      );

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

async function streamCrossExamination(
  participants: LLMParticipant[],
  question: string,
  allMessages: DebateMessage[],
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
): Promise<CrossExaminationQuestion[]> {
  const crossExamQuestions: CrossExaminationQuestion[] = [];
  
  const sortedByWins = [...participants];
  
  sendEvent(controller, encoder, "cross-exam-start", { 
    totalPairs: sortedByWins.length * 2 
  });
  
  for (let i = 0; i < sortedByWins.length; i++) {
    const asker = sortedByWins[i];
    const targets = sortedByWins.filter(p => p.id !== asker.id);
    
    for (const target of targets) {
      const questionId = `cross-exam-${asker.id}-${target.id}-${Date.now()}`;
      
      sendEvent(controller, encoder, "cross-exam-question", {
        questionId,
        askerId: asker.id,
        targetId: target.id
      });
      
      const questionPrompt = `You are ${asker.name}, a winner in this debate. Ask ONE pointed question to ${target.name} that challenges their position on the debate question: "${question}"

Context of their argument:
${allMessages.filter(m => m.participantId === target.id).slice(-2).map(m => m.content).join('\n\n')}

Ask a challenging but fair question. Keep it to 2 sentences max. Focus on the weakest point of their argument.`;

      const model = getModel(asker.provider, asker.model);
      let questionText = "";
      
      const { textStream: questionStream } = streamText({
        model,
        system: `You are ${asker.name}, asking a challenging question during cross-examination. Be precise and direct.`,
        prompt: questionPrompt,
        maxOutputTokens: 100,
        temperature: 0.5,
      });
      
      for await (const chunk of questionStream) {
        questionText += chunk;
        sendEvent(controller, encoder, "cross-exam-question-stream", {
          questionId,
          chunk: questionText
        });
      }
      
      sendEvent(controller, encoder, "cross-exam-question-complete", {
        questionId,
        question: questionText
      });
      
      sendEvent(controller, encoder, "cross-exam-answer", {
        questionId,
        targetId: target.id
      });
      
      const answerPrompt = `${target.name}, during cross-examination, you are being questioned by ${asker.name}.

The question: "${questionText}"

Your previous arguments:
${allMessages.filter(m => m.participantId === target.id).slice(-2).map(m => m.content).join('\n\n')}

Respond to this question defensively but honestly. Address the challenge directly. Keep your answer to 2-3 sentences.`;

      const targetModel = getModel(target.provider, target.model);
      let answerText = "";
      
      const { textStream: answerStream } = streamText({
        model: targetModel,
        system: `You are ${target.name}, defending your position during cross-examination. Be honest and address the challenge directly.`,
        prompt: answerPrompt,
        maxOutputTokens: 150,
        temperature: 0.5,
      });
      
      for await (const chunk of answerStream) {
        answerText += chunk;
        sendEvent(controller, encoder, "cross-exam-answer-stream", {
          questionId,
          chunk: answerText
        });
      }
      
      const sentiment = await analyzeSentiment(answerText);
      
      sendEvent(controller, encoder, "cross-exam-answer-complete", {
        questionId,
        answer: answerText,
        sentiment
      });
      
      crossExamQuestions.push({
        id: questionId,
        askerId: asker.id,
        targetId: target.id,
        question: questionText,
        answer: answerText,
        round: i + 1
      });
    }
  }
  
  sendEvent(controller, encoder, "cross-exam-end", {
    totalQuestions: crossExamQuestions.length
  });
  
  return crossExamQuestions;
}

export async function POST(req: NextRequest) {
  try {
    const body: DebateRequest = await req.json();
    const { question, participantIds, maxRounds, enableDevilsAdvocate, enableCrossExamination, enableWebSearch } = body;

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
          heartbeatInterval = setInterval(() => {
            try {
              sendEvent(controller, encoder, "heartbeat", { timestamp: Date.now() });
            } catch {
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
            enableDevilsAdvocate: !!enableDevilsAdvocate,
            enableCrossExamination: !!enableCrossExamination,
            enableWebSearch: !!enableWebSearch,
          });

          for (let round = 1; round <= rounds; round++) {
            sendEvent(controller, encoder, "round-start", { round, totalRounds: rounds });

            const devilsAdvocateForRound = enableDevilsAdvocate && round > 1 
              ? participants[Math.floor(Math.random() * participants.length)].id 
              : null;
            
            if (enableDevilsAdvocate && devilsAdvocateForRound) {
              sendEvent(controller, encoder, "devils-advocate", { 
                participantId: devilsAdvocateForRound,
                round
              });
            }

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
                messageId,
                1,
                enableWebSearch,
                enableDevilsAdvocate && devilsAdvocateForRound === participant.id
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

          if (enableCrossExamination) {
            await streamCrossExamination(participants, question, allMessages, controller, encoder);
          }

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

          const avgScore = votes.reduce((sum, v) => sum + v.score, 0) / votes.length;
          const consensusPercent = (avgScore / 10) * 100;

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
        "X-Accel-Buffering": "no",
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
