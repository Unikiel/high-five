import { BlockMath } from "react-katex";
import { Card, CardContent } from "@/components/ui/card";
import { FunctionSquare } from "lucide-react";
import { looksLikeCode } from "@/lib/textFormat";

function cleanFormula(formula) {
  return String(formula || "").replace(/^\$|\$$/g, "").trim();
}

function looksLikeLatex(value) {
  return /\\|\^|_|=|\frac|\sqrt|\sum|\mu|\sigma|\hat/.test(value);
}

export default function FormulaList({ formulas = [] }) {
  if (!formulas.length) return null;

  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
        <FunctionSquare className="w-5 h-5 text-primary" /> Definitions & Formulas
      </h2>
      <div className="grid gap-3">
        {formulas.map((formula, index) => {
          const value = cleanFormula(formula);
          return (
            <Card key={index} className="border border-border/70 bg-muted/20 rounded-2xl shadow-sm">
              <CardContent className="p-4 sm:p-5 overflow-x-auto">
                {looksLikeCode(value) ? (
                  <pre className="text-sm sm:text-base leading-7 text-foreground font-mono whitespace-pre-wrap">{value}</pre>
                ) : looksLikeLatex(value) ? (
                  <BlockMath math={value} />
                ) : (
                  <p className="text-sm sm:text-base leading-7 text-foreground">{value}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}