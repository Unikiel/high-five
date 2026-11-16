import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import MathText from "@/components/MathText";

const LETTERS = ["A", "B", "C", "D"];

const OPTION_STYLES = {
  idle: "border-border hover:border-primary/40 hover:bg-muted/30",
  right: "border-green-500 bg-green-50 dark:bg-green-950/30",
  wrong: "border-red-500 bg-red-50 dark:bg-red-950/30",
  rest: "border-border opacity-60",
};

/** One multiple-choice question that shows the right answer and its explanation as soon as an option is picked. */
export default function QuickCheckQuestion({ question, number }) {
  const [picked, setPicked] = useState(null);

  return (
    <Card className="border-border/50">
      <CardContent className="p-5 space-y-4">
        <div className="text-foreground font-medium leading-relaxed">
          <span className="text-muted-foreground mr-2">{number}.</span>
          <MathText text={question.question_text} />
        </div>
        <div className="space-y-2">
          {(question.options || []).map((option, index) => {
            const letter = LETTERS[index];
            const state = !picked ? "idle" : letter === question.correct_answer ? "right" : letter === picked ? "wrong" : "rest";
            return (
              <button
                key={letter}
                disabled={!!picked}
                onClick={() => setPicked(letter)}
                className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border-2 transition-all ${OPTION_STYLES[state]}`}
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">{letter}</span>
                <span className="text-sm text-foreground pt-0.5"><MathText text={option} /></span>
              </button>
            );
          })}
        </div>
        {picked && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <span className="font-medium text-foreground">{picked === question.correct_answer ? "Correct. " : "Not quite. "}</span>
            <MathText text={question.explanation} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}