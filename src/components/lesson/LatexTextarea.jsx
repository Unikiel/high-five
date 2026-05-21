import { BlockMath } from "react-katex";
import { Textarea } from "@/components/ui/textarea";

export default function LatexTextarea({ label, value, onChange, placeholder, className = "min-h-24" }) {
  const preview = String(value || "").replace(/^\$\$?|\$\$?$/g, "").trim();

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${className} bg-background font-mono`} />
      {preview && (
        <div className="rounded-xl border border-border bg-background p-3 overflow-x-auto">
          <p className="text-xs text-muted-foreground mb-2">LaTeX preview</p>
          <BlockMath math={preview} />
        </div>
      )}
    </div>
  );
}