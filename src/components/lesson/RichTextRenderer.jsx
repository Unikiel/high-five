import { InlineMath, BlockMath } from "react-katex";
import { Card, CardContent } from "@/components/ui/card";

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
    .replace(/\\n/g, "\n");
}

function renderMathText(text) {
  const parts = String(text || "").split(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith("$$") && part.endsWith("$$")) {
      return <BlockMath key={index} math={part.slice(2, -2).trim()} />;
    }
    if (part.startsWith("$") && part.endsWith("$")) {
      return <InlineMath key={index} math={part.slice(1, -1).trim()} />;
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