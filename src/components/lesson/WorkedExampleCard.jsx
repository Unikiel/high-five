import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import MathText from "@/components/MathText";

export default function WorkedExampleCard({ example }) {
  const [showSolution, setShowSolution] = useState(false);

  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-sm p-5 sm:p-6">
      <div className="space-y-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">Problem</p>
          <div className="text-sm sm:text-base font-medium text-foreground leading-relaxed"><MathText text={example.problem} /></div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowSolution((value) => !value)}
          className="rounded-lg bg-white dark:bg-card shadow-sm"
        >
          {showSolution ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showSolution ? "Hide Solution" : "Show Solution"}
        </Button>

        {showSolution && (
          <div className="space-y-3 pt-1">
            <div className="rounded-xl bg-primary/8 border border-primary/10 px-4 py-5 text-left">
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-3">Answer</p>
              <div className="text-sm sm:text-base text-foreground leading-relaxed whitespace-pre-wrap"><MathText text={example.solution} /></div>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-4 dark:bg-amber-950/20 dark:border-amber-900/40">
              <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-2">Explanation</p>
              <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">Review the steps above and apply the same method to similar practice questions.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}