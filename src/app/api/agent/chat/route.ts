import {
  tool,
  streamText,
  convertToModelMessages,
  UIMessage,
  stepCountIs,
} from "ai";
import { NextRequest } from "next/server";
import { z } from "zod";
import { ollama } from "ai-sdk-ollama";
import { execSync } from "node:child_process";
import { createBashTool } from "bash-tool";

export async function POST(req: NextRequest) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const { tools } = await createBashTool();

  const result = streamText({
    model: ollama("minimax-m2.5:cloud"),
    system:
      "You are a helpful assistant. You can browse the web in a browser through `agent-browser` cli from `webTool` tool. You have to control the browser via browser tool, the user is also viewing the browser so you dont have to take screenshots. You can write or read / write to files or run command in a sandboxed environment through bash, write, read tools. These exttra tool are for you to store information and orchestrate your work, use them when you think is necessary.",
    tools: {
      bash: tools.bash,
      write: tools.writeFile,
      read: tools.readFile,
      browser: {
        description:
          "Used to run agent-browser commands, example: `agent-browser open https://www.google.com`. Omit `agent-browser` and pass its arguments",
        inputSchema: z.object({
          commandarg: z
            .string()
            .optional()
            .describe(
              "Arguments for the agent-browser command, for example: `open https://www.google.com` or `snapshot -i -c -d <depth/2>` or empty string to see available commands and there use case.",
            ),
        }),
        execute: ({ commandarg }) => {
          const result = execSync(`npx agent-browser ${commandarg}`);

          return {
            stdout: result,
          };
        },
      },
    },
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(100),
  });

  return result.toUIMessageStreamResponse();
}
