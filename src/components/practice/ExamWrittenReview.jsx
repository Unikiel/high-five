import { Card, CardContent } from "@/components/ui/card";
import MathText from "@/components/MathText";
import FreeResponseFeedback from "@/components/practice/FreeResponseFeedback";

/** Results-page review of one written exam question: the student's answer and the AI's scoring of it. */
export default function ExamWrittenReview({ question, number, answer, result }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4 space-y-3">
        <div className="text-sm font-medium text-foreground">Q{number}. <MathText text={question.q} /></div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Your answer</p>
          <div className="text-sm text-foreground bg-muted/50 p-3 rounded whitespace-pre-wrap">{answer?.trim() || "Not answered"}</div>
        </div>
        {result
          ? <FreeResponseFeedback result={result} modelAnswer={question.ans} />
          : <p className="text-sm text-destructive">This answer could not be graded.</p>}
      </CardContent>
    </Card>
  );
}