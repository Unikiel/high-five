import { InlineMath, BlockMath } from "react-katex";
import { looksLikeCode } from "@/lib/textFormat";

// "\$" is a literal dollar sign (a price), never a math delimiter. It is
// swapped for a placeholder before splitting on "$" and restored afterwards.
const DOLLAR = "\uE000";
const asText = (value) => value.replace(/\uE000/g, () => "$");
const asMath = (value) => value.replace(/\uE000/g, () => "\\$");

// Display math, inline math, or inline math that opens with a digit. The last
// form must close tightly and not run into another number, so two prices in
// one sentence ("from $5 to $8") stay text instead of being read as a formula.
const MATH_SPANS = /(\$\$[\s\S]+?\$\$|\$(?!\d)[^$\n]+?\$|\$\d(?:[^$\n]*?[^\s$])?\$(?!\d))/g;

/**
 * Renders text containing inline ($...$) and display ($$...$$) LaTeX.
 */
export default function MathText({ text, className }) {
  const normalized = String(text || "").replace(/\\\$/g, DOLLAR).replace(/\\n(?![a-z])/g, "\n");
  const parts = normalized.split(MATH_SPANS).filter(Boolean);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith("$$") && part.endsWith("$$")) {
          const inner = part.slice(2, -2).trim();
          if (looksLikeCode(inner)) {
            return <pre key={index} className="font-mono text-[0.95em] whitespace-pre-wrap not-italic">{asText(inner)}</pre>;
          }
          return <BlockMath key={index} math={asMath(inner)} />;
        }
        if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
          const inner = part.slice(1, -1).trim();
          if (looksLikeCode(inner)) {
            return <code key={index} className="font-mono text-[0.95em] px-1 rounded bg-muted/60">{asText(inner)}</code>;
          }
          return <InlineMath key={index} math={asMath(inner)} />;
        }
        return <span key={index} className="whitespace-pre-wrap">{asText(part)}</span>;
      })}
    </span>
  );
}