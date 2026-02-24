"use client";

import { useState } from "react";
import { LLMParticipant } from "@/types/council";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, User, Briefcase, Heart, Zap, Shield, Ghost } from "lucide-react";

interface DefaultPersona {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  personality: string;
}

const DEFAULT_PERSONAS: DefaultPersona[] = [
  {
    id: "skeptic",
    name: "Skeptic",
    description: "Questions everything",
    icon: <Ghost className="h-4 w-4" />,
    personality: "You are a skeptic who questions everything. Always challenge assumptions and demand evidence.",
  },
  {
    id: "optimist",
    name: "Optimist",
    description: "Focuses on positives",
    icon: <Heart className="h-4 w-4" />,
    personality: "You are an optimist who always sees the bright side. Highlight opportunities and potential benefits.",
  },
  {
    id: "pragmatist",
    name: "Pragmatist",
    description: "Realistic and practical",
    icon: <Briefcase className="h-4 w-4" />,
    personality: "You are a pragmatist focused on practical solutions. Emphasize feasibility and real-world outcomes.",
  },
  {
    id: "devil",
    name: "Devil's Advocate",
    description: "Argues the opposite",
    icon: <Shield className="h-4 w-4" />,
    personality: "You always argue the opposing view. Challenge prevailing opinions and find flaws in arguments.",
  },
  {
    id: "futurist",
    name: "Futurist",
    description: "Thinks long-term",
    icon: <Zap className="h-4 w-4" />,
    personality: "You think about long-term implications. Consider future impacts and emerging trends.",
  },
];

interface CustomPersonaCreatorProps {
  onCreatePersona: (persona: LLMParticipant) => void;
}

export function CustomPersonaCreator({ onCreatePersona }: CustomPersonaCreatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [personality, setPersonality] = useState("");
  const [selectedBasePersona, setSelectedBasePersona] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!name.trim() || !personality.trim()) return;

    const basePersona = DEFAULT_PERSONAS.find((p) => p.id === selectedBasePersona);
    const combinedPersonality = basePersona
      ? `${basePersona.personality} ${personality}`
      : personality;

    const newPersona: LLMParticipant = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      model: "custom",
      provider: "custom",
      avatar: name.trim().charAt(0).toUpperCase(),
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      personality: combinedPersonality,
    };

    onCreatePersona(newPersona);
    setIsOpen(false);
    setName("");
    setPersonality("");
    setSelectedBasePersona(null);
  };

  if (!isOpen) {
    return (
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Create Custom Persona
      </Button>
    );
  }

  return (
    <Card className="mt-3">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Create Custom Persona</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-xs font-medium mb-1 block">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Conservative Analyst"
            className="w-full px-3 py-1.5 text-sm rounded-md border bg-background"
          />
        </div>

        <div>
          <label className="text-xs font-medium mb-1.5 block">Base Persona</label>
          <div className="grid grid-cols-2 gap-2">
            {DEFAULT_PERSONAS.map((persona) => (
              <div
                key={persona.id}
                className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                  selectedBasePersona === persona.id
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted"
                }`}
                onClick={() => setSelectedBasePersona(persona.id)}
              >
                {persona.icon}
                <span className="text-xs">{persona.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium mb-1 block">Additional Instructions</label>
          <textarea
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            placeholder="e.g., Always cite statistics and data in arguments..."
            className="w-full px-3 py-1.5 text-sm rounded-md border bg-background min-h-[60px] resize-none"
          />
        </div>

        <Button size="sm" onClick={handleSubmit} disabled={!name.trim() || !personality.trim()}>
          Add Persona
        </Button>
      </CardContent>
    </Card>
  );
}

interface PersonaSelectorProps {
  selectedPersonas: string[];
  onSelectionChange: (ids: string[]) => void;
  disabled?: boolean;
}

interface DisplayPersona {
  id: string;
  name: string;
  description?: string;
  icon?: React.ReactNode;
  personality: string;
  isCustom: boolean;
}

export function PersonaSelector({ selectedPersonas, onSelectionChange, disabled }: PersonaSelectorProps) {
  const [customPersonas, setCustomPersonas] = useState<LLMParticipant[]>([]);

  const allPersonas: DisplayPersona[] = [
    ...DEFAULT_PERSONAS.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      icon: p.icon,
      personality: p.personality,
      isCustom: false,
    })),
    ...customPersonas.map((p) => ({
      id: p.id,
      name: p.name,
      personality: p.personality,
      isCustom: true,
    })),
  ];

  const togglePersona = (id: string) => {
    if (disabled) return;

    if (selectedPersonas.includes(id)) {
      onSelectionChange(selectedPersonas.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedPersonas, id]);
    }
  };

  const handleCreatePersona = (persona: LLMParticipant) => {
    setCustomPersonas([...customPersonas, persona]);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {allPersonas.map((persona) => {
          const isSelected = selectedPersonas.includes(persona.id);

          return (
            <div
              key={persona.id}
              className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={() => togglePersona(persona.id)}
            >
              <Checkbox checked={isSelected} disabled={disabled} className="pointer-events-none" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{persona.name}</p>
                {persona.description && (
                  <p className="text-[10px] text-muted-foreground truncate">{persona.description}</p>
                )}
              </div>
              {persona.isCustom && <Badge variant="secondary" className="text-[10px]">Custom</Badge>}
            </div>
          );
        })}
      </div>

      <CustomPersonaCreator onCreatePersona={handleCreatePersona} />
    </div>
  );
}
