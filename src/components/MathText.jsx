import { InlineMath, BlockMath } from "react-katex";
import { looksLikeCode } from "@/lib/textFormat";

/**
 * Renders text containing inline ($...$) and display ($$...$$) LaTeX.
 */
export default function MathText({ text, className }) {
  const normalized = String(text || "").replace(/\\n(?![a-z])/g, "\n");
  const parts = normalized.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g).filter(Boolean);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith("$$") && part.endsWith("$$")) {
          const inner = part.slice(2, -2).trim();
          if (looksLikeCode(inner)) {
            return <pre key={index} className="font-mono text-[0.95em] whitespace-pre-wrap not-italic">{inner}</pre>;
          }
          return <BlockMath key={index} math={inner} />;
        }
        if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
          const inner = part.slice(1, -1).trim();
          if (looksLikeCode(inner)) {
            return <code key={index} className="font-mono text-[0.95em] px-1 rounded bg-muted/60">{inner}</code>;
          }
          return <InlineMath key={index} math={inner} />;
        }
        return <span key={index} className="whitespace-pre-wrap">{part}</span>;
      })}
    </span>
  );
}