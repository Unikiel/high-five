import { useState } from "react";
import { Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function InlineLessonEditor({ content, saving, onCancel, onSave }) {
  const [draft, setDraft] = useState({
    explanation: content?.explanation || "",
    formulasText: (content?.formulas || []).join("\n"),
    cheatsheetText: (content?.cheatsheet || []).join("\n"),
    examples: content?.examples?.length ? content.examples : [{ problem: "", solution: "" }],
  });

  const updateExample = (index, field, value) => {
    setDraft((current) => ({
      ...current,
      examples: current.examples.map((example, i) => i === index ? { ...example, [field]: value } : example),
    }));
  };

  const removeExample = (index) => {
    setDraft((current) => ({ ...current, examples: current.examples.filter((_, i) => i !== index) }));
  };

  const handleSave = () => {
    onSave({
      explanation: draft.explanation,
      formulas: draft.formulasText.split("\n").map((item) => item.trim()).filter(Boolean),
      cheatsheet: draft.cheatsheetText.split("\n").map((item) => item.trim()).filter(Boolean),
      examples: draft.examples.filter((example) => example.problem.trim() || example.solution.trim()),
    });
  };

  return (
    <Card className="border-primary/30 bg-primary/5 rounded-2xl">
      <CardContent className="p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Edit Lesson Content</h2>
            <p className="text-sm text-muted-foreground">Changes save directly to this topic.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel} disabled={saving}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Lesson explanation</label>
          <Textarea value={draft.explanation} onChange={(e) => setDraft((current) => ({ ...current, explanation: e.target.value }))} className="min-h-48 bg-background" />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Definitions & formulas</label>
            <Textarea value={draft.formulasText} onChange={(e) => setDraft((current) => ({ ...current, formulasText: e.target.value }))} className="min-h-36 bg-background" placeholder="One formula per line" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Quick reference</label>
            <Textarea value={draft.cheatsheetText} onChange={(e) => setDraft((current) => ({ ...current, cheatsheetText: e.target.value }))} className="min-h-36 bg-background" placeholder="One bullet per line" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Worked examples</label>
            <Button type="button" variant="outline" size="sm" onClick={() => setDraft((current) => ({ ...current, examples: [...current.examples, { problem: "", solution: "" }] }))}>
              <Plus className="w-4 h-4" /> Add Example
            </Button>
          </div>
          {draft.examples.map((example, index) => (
            <div key={index} className="rounded-xl border border-border bg-background p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Example {index + 1}</span>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeExample(index)} disabled={draft.examples.length === 1}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <Input value={example.problem} onChange={(e) => updateExample(index, "problem", e.target.value)} placeholder="Problem" />
              <Textarea value={example.solution} onChange={(e) => updateExample(index, "solution", e.target.value)} placeholder="Solution" className="min-h-24" />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" />{saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}