import { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import MathText from "@/components/MathText";

/** The AI's scoring of one written answer: total, each scoring-guide point, overall feedback, model answer. */
export default function FreeResponseFeedback({ result, modelAnswer }) {
  const [showModel, setShowModel] = useState(false);

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-lg font-bold text-foreground">Score: {result.score}/{result.max}</p>
        <Badge variant="secondary">Graded by AI</Badge>
      </div>

      {result.points.length > 0 && (
        <ul className="space-y-3">
          {result.points.map((point, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              {point.earned
                ? <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                : <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
              <div className="space-y-0.5">
                <div className="font-medium text-foreground"><MathText text={point.criterion} /></div>
                <div className="text-muted-foreground"><MathText text={point.comment} /></div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {result.feedback && (
        <div className="text-sm text-foreground leading-relaxed"><MathText text={result.feedback} /></div>
      )}

      <Button variant="outline" size="sm" onClick={() => setShowModel((shown) => !shown)}>
        {showModel ? "Hide model answer" : "Show model answer"}
      </Button>
      {showModel && (
        <div className="text-sm text-foreground leading-relaxed rounded-lg border border-border bg-background p-3">
          <MathText text={modelAnswer} />
        </div>
      )}
    </div>
  );
}