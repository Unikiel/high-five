import { Card, CardContent } from "@/components/ui/card";

function normalizeLine(line) {
  return String(line || "")
    .replace(/^#{1,6}\s*/, "")
    .replace(/^[-*]\s*/, "")
    .trim();
}

export default function LessonContent({ text }) {
  const lines = String(text || "").split("\n");
  const sections = [];
  let current = { title: "Lesson", body: [] };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (/^#{1,6}\s+/.test(trimmed) || /^(Definition and Big Idea|Core Definitions|How It Works|AP Exam Strategy|Common Mistakes|Worked Example Setup)$/i.test(trimmed)) {
      if (current.body.length || current.title !== "Lesson") sections.push(current);
      current = { title: normalizeLine(trimmed), body: [] };
      return;
    }

    current.body.push(normalizeLine(trimmed));
  });

  if (current.body.length || current.title !== "Lesson") sections.push(current);

  return (
    <div className="space-y-4">
      {sections.map((section, index) => (
        <Card key={index} className="border border-border/70 shadow-sm bg-card rounded-2xl">
          <CardContent className="p-5 sm:p-6">
            <h2 className="font-display text-lg sm:text-xl font-bold text-foreground mb-3">
              {section.title}
            </h2>
            <div className="space-y-3">
              {section.body.map((paragraph, paragraphIndex) => (
                <p key={paragraphIndex} className="text-sm sm:text-base leading-7 text-muted-foreground">
                  {paragraph}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}