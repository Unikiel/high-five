import { InlineMath, BlockMath } from "react-katex";
import { Card, CardContent } from "@/components/ui/card";
import { looksLikeCode } from "@/lib/textFormat";

function htmlToText(html) {
  return String(html || "")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\\n(?![a-z])/g, "\n");
}

function renderMathText(text) {
  const parts = String(text || "").split(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith("$$") && part.endsWith("$$")) {
      const inner = part.slice(2, -2).trim();
      if (looksLikeCode(inner)) {
        return <pre key={index} className="font-mono text-[0.95em] whitespace-pre-wrap text-foreground">{inner}</pre>;
      }
      return <BlockMath key={index} math={inner} />;
    }
    if (part.startsWith("$") && part.endsWith("$")) {
      const inner = part.slice(1, -1).trim();
      if (looksLikeCode(inner)) {
        return <code key={index} className="font-mono text-[0.95em] px-1 rounded bg-muted/60 text-foreground">{inner}</code>;
      }
      return <InlineMath key={index} math={inner} />;
    }
    return <span key={index}>{part}</span>;
  });
}

export default function RichTextRenderer({ html }) {
  const text = htmlToText(html);
  const paragraphs = text.split("\n").map((line) => line.trim()).filter(Boolean);

  if (!paragraphs.length) return null;

  return (
    <div className="space-y-4">
      <Card className="border border-border/70 shadow-sm bg-card rounded-2xl">
        <CardContent className="p-5 sm:p-6 space-y-3 text-sm sm:text-base leading-7 text-muted-foreground">
          {paragraphs.map((paragraph, index) => {
            const heading = paragraph.match(/^#{1,6}\s+(.*)$/);
            if (heading) {
              return (
                <h2 key={index} className="font-display text-lg sm:text-xl font-bold text-foreground pt-2">
                  {renderMathText(heading[1])}
                </h2>
              );
            }
            return <p key={index}>{renderMathText(paragraph.replace(/\*\*/g, ""))}</p>;
          })}
        </CardContent>
      </Card>
    </div>
  );
}