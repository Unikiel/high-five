import { useState } from "react";
import ReactQuill from "react-quill";
import { Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import LatexTextarea from "@/components/lesson/LatexTextarea";

export default function InlineLessonEditor({ content, saving, onCancel, onSave }) {
  const [draft, setDraft] = useState({
    explanation: content?.explanation || "",
    formulas: content?.formulas?.length ? content.formulas : [""],
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

  const updateFormula = (index, value) => {
    setDraft((current) => ({
      ...current,
      formulas: current.formulas.map((formula, i) => i === index ? value : formula),
    }));
  };

  const removeFormula = (index) => {
    setDraft((current) => ({ ...current, formulas: current.formulas.filter((_, i) => i !== index) }));
  };

  const handleSave = () => {
    onSave({
      explanation: draft.explanation,
      formulas: draft.formulas.map((item) => item.trim()).filter(Boolean),
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
          <div className="bg-background rounded-xl border border-input overflow-hidden [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-border [&_.ql-container]:border-0 [&_.ql-editor]:min-h-48 [&_.ql-editor]:text-base">
            <ReactQuill
              theme="snow"
              value={draft.explanation}
              onChange={(value) => setDraft((current) => ({ ...current, explanation: value }))}
              modules={{ toolbar: [["bold", "italic", "underline"], [{ list: "ordered" }, { list: "bullet" }], ["blockquote"], ["clean"]] }}
            />
          </div>
          <p className="text-xs text-muted-foreground">For math, type inline LaTeX like $f'(x)$ or display LaTeX like $$\\int_a^b f(x)dx$$.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Definitions & formulas</label>
              <Button type="button" variant="outline" size="sm" onClick={() => setDraft((current) => ({ ...current, formulas: [...current.formulas, ""] }))}>
                <Plus className="w-4 h-4" /> Add Formula
              </Button>
            </div>
            {draft.formulas.map((formula, index) => (
              <div key={index} className="rounded-xl border border-border bg-background p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Formula {index + 1}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeFormula(index)} disabled={draft.formulas.length === 1}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <LatexTextarea value={formula} onChange={(value) => updateFormula(index, value)} placeholder="\\frac{dy}{dx}" className="min-h-20" />
              </div>
            ))}
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
              <Input value={example.problem} onChange={(e) => updateExample(index, "problem", e.target.value)} placeholder="Problem, supports LaTeX like $x^2$" />
              <Textarea value={example.solution} onChange={(e) => updateExample(index, "solution", e.target.value)} placeholder="Solution, supports LaTeX like $$\\frac{1}{2}$$" className="min-h-24 font-mono" />
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