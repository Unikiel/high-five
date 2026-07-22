import { InlineMath, BlockMath } from "react-katex";

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
          return <BlockMath key={index} math={part.slice(2, -2).trim()} />;
        }
        if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
          return <InlineMath key={index} math={part.slice(1, -1).trim()} />;
        }
        return <span key={index} className="whitespace-pre-wrap">{part}</span>;
      })}
    </span>
  );
}