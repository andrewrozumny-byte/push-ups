"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

type Motivator = { text: string; source?: string };

export function DailyMotivator() {
  const [motivator, setMotivator] = useState<Motivator | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/motivator?mode=daily")
      .then((res) => res.json())
      .then((data) => {
        setMotivator(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">Завантаження...</p>
        </CardContent>
      </Card>
    );
  }

  if (!motivator) return null;

  return (
    <Card className="bg-muted/30 border-primary/20">
      <CardContent className="py-4">
        <p className="text-sm font-medium italic">&ldquo;{motivator.text}&rdquo;</p>
        {motivator.source && (
          <p className="mt-1 text-xs text-muted-foreground">{motivator.source}</p>
        )}
      </CardContent>
    </Card>
  );
}
