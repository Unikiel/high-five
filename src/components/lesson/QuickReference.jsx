import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

function cleanItem(item) {
  return String(item || "").replace(/^[-*]\s*/, "").trim();
}

export default function QuickReference({ items = [] }) {
  const cleanItems = items.map(cleanItem).filter(Boolean);
  if (!cleanItems.length) return null;

  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" /> Quick Reference
      </h2>
      <Card className="border border-border/70 shadow-sm bg-card rounded-2xl">
        <CardContent className="p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {cleanItems.map((item, index) => (
              <div key={index} className="rounded-xl bg-muted/40 p-4 text-sm leading-6 text-foreground">
                <span className="mr-2 font-bold text-primary">{index + 1}.</span>{item}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}