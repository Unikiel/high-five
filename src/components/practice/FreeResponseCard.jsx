import { useState } from "react";
import { Loader2, PenLine, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import MathText from "@/components/MathText";
import FreeResponseFeedback from "@/components/practice/FreeResponseFeedback";

/** One written question: the student types an answer and the AI scores it against the scoring guide. */
export default function FreeResponseCard({ question }) {
  const [answer, setAnswer] = useState("");
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const grade = async () => {
    setGrading(true);
    setError("");
    try {
      const { data } = await base44.functions.invoke("gradeFreeResponse", { question_id: question.id, answer });
      setResult(data);
    } catch (e) {
      setError("Your answer could not be graded. Please try again.");
    }
    setGrading(false);
  };

  return (
    <Card className="border-border/50">
      <CardContent className="p-5 space-y-4">
        <Badge variant="secondary" className="gap-1.5"><PenLine className="w-3 h-3" />Free response</Badge>
        <div className="text-foreground font-medium leading-relaxed"><MathText text={question.question_text} /></div>
        <Textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={grading}
          placeholder="Type your answer and show your work, labelling each part (a), (b), (c)..."
          className="min-h-40"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={grade} disabled={grading || !answer.trim()} className="gap-2">
          {grading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {grading ? "Grading..." : result ? "Grade again" : "Grade my answer"}
        </Button>
        {result && <FreeResponseFeedback result={result} modelAnswer={question.correct_answer} />}
      </CardContent>
    </Card>
  );
}