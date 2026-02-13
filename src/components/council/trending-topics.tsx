"use client";

import { TrendingTopic } from "@/types/council";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, RefreshCw, Zap, Cpu, Globe, Sparkles, ArrowRight } from "lucide-react";
import { useState } from "react";

const DEFAULT_TRENDING_TOPICS: TrendingTopic[] = [
  { id: "1", topic: "Should AI development be paused until safety is guaranteed?", category: "AI Safety", votes: 1247 },
  { id: "2", topic: "What programming language should beginners learn in 2025?", category: "Technology", votes: 982 },
  { id: "3", topic: "Is remote work better than office work for productivity?", category: "Work", votes: 876 },
  { id: "4", topic: "Should social media be regulated like public utilities?", category: "Policy", votes: 654 },
  { id: "5", topic: "Crypto: Is it the future of finance or a bubble?", category: "Finance", votes: 543 },
  { id: "6", topic: "Should there be a universal basic income?", category: "Policy", votes: 432 },
  { id: "7", topic: "Space exploration: Worth the investment?", category: "Science", votes: 321 },
  { id: "8", topic: "AI art: Real creativity or sophisticated copying?", category: "Art", votes: 298 },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "AI Safety": <Cpu className="h-3.5 w-3.5" />,
  "Technology": <Zap className="h-3.5 w-3.5" />,
  "Work": <Globe className="h-3.5 w-3.5" />,
  "Policy": <TrendingUp className="h-3.5 w-3.5" />,
  "Finance": <Zap className="h-3.5 w-3.5" />,
  "Science": <Sparkles className="h-3.5 w-3.5" />,
  "Art": <Sparkles className="h-3.5 w-3.5" />,
};

interface TrendingTopicsProps {
  onSelectTopic: (topic: string) => void;
}

export function TrendingTopics({ onSelectTopic }: TrendingTopicsProps) {
  const [topics, setTopics] = useState<TrendingTopic[]>(DEFAULT_TRENDING_TOPICS);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const shuffled = [...topics].sort(() => Math.random() - 0.5);
      setTopics(shuffled);
      setIsRefreshing(false);
    }, 500);
  };

  const handleSelect = (topic: string) => {
    onSelectTopic(topic);
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Trending Topics
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 w-6 p-0"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
          {topics.slice(0, 6).map((item, index) => (
            <div
              key={item.id}
              className="group flex items-center gap-2 p-2 rounded-md hover:bg-primary/10 cursor-pointer transition-colors"
              onClick={() => handleSelect(item.topic)}
            >
              <span className="text-xs font-mono text-muted-foreground w-4">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                  {item.topic}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                    {CATEGORY_ICONS[item.category] || <Zap className="h-3 w-3" />}
                    <span className="ml-1">{item.category}</span>
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {item.votes.toLocaleString()} debates
                  </span>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 text-primary transition-opacity flex-shrink-0" />
            </div>
          ))}
        </div>
        <div className="mt-3 pt-2 border-t">
          <p className="text-[10px] text-muted-foreground text-center">
            Click a topic to start debating
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
