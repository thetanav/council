"use client";

import { useState, useRef, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Loader2,
  Trash2,
  Globe,
  Sparkles,
  Monitor,
  ChevronDown,
  ChevronUp,
  Terminal,
  Play,
  CheckCircle2,
  Circle,
  StopCircle,
  Star,
  SquareMousePointer,
  NotebookPen,
  BookOpenCheck,
  RotateCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Streamdown } from "streamdown";
import { Switch } from "@/components/ui/switch";

export default function AgentPage() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentFrame, setCurrentFrame] = useState<string | null>(null);

  const { messages, sendMessage, setMessages, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/agent/chat",
    }),
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const pollScreen = async () => {
    try {
      const res = await fetch("/api/agent/screen");
      const data = await res.json();
      if (data.success && data.image) {
        setCurrentFrame(data.image);
      }
    } catch (error) {
      console.error("Failed to poll screen:", error);
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex-1 flex overflow-hidden">
        <div className="w-2/3 border-r flex flex-col">
          <div className="p-4 flex border-b bg-muted/30 justify-between">
            <h2 className="font-medium flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Chat
            </h2>
            <Button variant="outline" size="sm" onClick={handleClear}>
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4 overflow-y-scroll">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-12">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Start a conversation</p>
                  <p className="text-sm mt-2">
                    Tell the agent what you want to do in the browser
                  </p>
                </div>
              )}

              {messages.map((message, index) => (
                <div key={index}>
                  {message.parts.map((part, partIndex) => {
                    if (part.type === "text") {
                      return (
                        <Streamdown
                          key={partIndex}
                          className={`${message.role === "user" ? "text-right text-sm opacity-60" : "text-left text-sm"}`}>
                          {part.text}
                        </Streamdown>
                      );
                    }
                    if (part.type === "tool-browser") {
                      return (
                        <div key={partIndex} className="text-xs opacity-40">
                          <SquareMousePointer className="h-3 w-3 inline-block mr-1" />
                          {part.input!.commandarg}
                        </div>
                      );
                    }
                    if (part.type === "tool-bash") {
                      return (
                        <div
                          key={partIndex}
                          className="text-xs flex opacity-40">
                          <Terminal className="h-3 w-3 inline-block mr-1" />
                          {part.input!.command}
                        </div>
                      );
                    }
                    if (part.type === "tool-write") {
                      return (
                        <div key={partIndex} className="text-xs opacity-40">
                          <NotebookPen className="h-3 w-3 inline-block mr-1" />
                          {part.input!.path}
                        </div>
                      );
                    }
                    if (part.type === "tool-read") {
                      return (
                        <div
                          key={partIndex}
                          className="text-xs flex opacity-40">
                          <BookOpenCheck className="h-3 w-3 inline-block mr-1" />
                          {part.input!.path}
                        </div>
                      );
                    }
                  })}
                </div>
              ))}

              {status == "streaming" && (
                <div className="flex">
                  <Star className="fill-blue-500 stroke-blue-600 h-4 w-4 animate-bounce" />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="p-2 border-t">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                }}
                onKeyDown={async (event) => {
                  if (event.key === "Enter") {
                    sendMessage({
                      parts: [{ type: "text", text: input }],
                    });
                  }
                }}
                placeholder="What would you like to do in the browser? (e.g., 'Show me latest issue in react repo')"
                className="min-h-[80px] resize-none rounded-xl"
              />
              <Button
                onClick={() => {
                  if (status != "streaming") {
                    sendMessage({
                      parts: [{ type: "text", text: input }],
                    });
                  } else {
                    stop();
                  }
                }}
                disabled={!input.trim()}
                size={"icon-sm"}
                className="self-end rounded-xl cursor-pointer">
                {status == "ready" && <Send className="h-4 w-4" />}
                {status == "streaming" && <StopCircle className="h-4 w-4" />}
                {status == "submitted" && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="w-2/3 flex flex-col">
          <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
            <h2 className="font-medium flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Screen
            </h2>
            <div className="flex gap-1 items-center">
              <p>CDP Mode</p>
              <Switch id="airplane-mode" />
            </div>
            <Button
              variant={"outline"}
              size={"icon-sm"}
              onClick={() => pollScreen()}>
              <RotateCw />
            </Button>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto bg-black flex items-center justify-center">
              {currentFrame ? (
                <img
                  src={currentFrame}
                  alt="Browser View"
                  className="max-w-full h-auto pointer-events-none select-none"
                />
              ) : (
                <div className="text-center text-muted-foreground p-8">
                  <Monitor className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">
                    Browser view will appear here
                  </p>
                  <p className="text-sm mt-2 text-muted-foreground/70">
                    Start a conversation to begin
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
