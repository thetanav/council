"use client";

import { LLMParticipant } from "@/types/council";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface LLMSelectorProps {
  llms: LLMParticipant[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function LLMSelector({
  llms,
  selectedIds,
  onSelectionChange,
  disabled = false,
}: LLMSelectorProps) {
  const toggleLLM = (id: string) => {
    if (disabled) return;

    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const getProviderLabel = (provider: string) => {
    switch (provider) {
      case "openai":
        return "OpenAI";
      case "anthropic":
        return "Anthropic";
      case "google":
        return "Google";
      case "ollama":
        return "Ollama";
      case "openrouter":
        return "Openrouter";
      default:
        return provider;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {llms.map((llm) => {
        const isSelected = selectedIds.includes(llm.id);

        return (
          <Card
            key={llm.id}
            className={`cursor-pointer transition-all duration-200 ${isSelected
              ? "ring-2 ring-primary bg-primary/5"
              : "hover:bg-muted/50"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={() => toggleLLM(llm.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={isSelected}
                  disabled={disabled}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm">{llm.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {getProviderLabel(llm.provider)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {llm.personality.slice(0, 80)}...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
