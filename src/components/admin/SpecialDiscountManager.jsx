import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Tag, Pencil, X } from "lucide-react";

const EMPTY_DISCOUNT = {
  code: "",
  customer_email: "",
  percent_off: 10,
  plan_type: "any",
  is_combinable: true,
  is_active: true,
  expires_at: ""
};

const DRAFT_KEY = "hf-special-discount-draft";

export default function SpecialDiscountManager() {
  const [discounts, setDiscounts] = useState([]);
  const [form, setForm] = useState(() => {
    try {
      return { ...EMPTY_DISCOUNT, ...(JSON.parse(localStorage.getItem(DRAFT_KEY)) || {}) };
    } catch {
      return { ...EMPTY_DISCOUNT };
    }
  });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState({ text: "", ok: false });

  const updateForm = (updates) => {
    setForm(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      return next;
    });
  };

  const loadDiscounts = async () => {
    const data = await base44.entities.SpecialDiscount.list("-created_date", 50);
    setDiscounts(data);
  };

  useEffect(() => { loadDiscounts(); }, []);

  const resetForm = () => {
    localStorage.removeItem(DRAFT_KEY);
    setForm({ ...EMPTY_DISCOUNT });
    setEditingId(null);
  };

  const startEdit = (discount) => {
    setEditingId(discount.id);
    setForm({
      code: discount.code || "",
      customer_email: discount.customer_email || "",
      percent_off: discount.percent_off || 10,
      plan_type: discount.plan_type || "any",
      is_combinable: discount.is_combinable !== false,
      is_active: discount.is_active !== false,
      expires_at: discount.expires_at || ""
    });
    setMessage({ text: "Editing discount code.", ok: true });
  };

  const saveDiscount = async () => {
    const code = form.code.trim().toUpperCase();
    if (!code || !form.percent_off) {
      setMessage({ text: "Please enter a discount code and percentage.", ok: false });
      return;
    }
    setSaving(true);
    setMessage({ text: "", ok: false });
    const payload = {
      ...form,
      code,
      customer_email: form.customer_email.trim().toLowerCase(),
      percent_off: Math.min(Math.max(Number(form.percent_off), 1), 100),
      is_combinable: Boolean(form.is_combinable),
      is_active: Boolean(form.is_active)
    };
    if (editingId) {
      await base44.entities.SpecialDiscount.update(editingId, payload);
    } else {
      await base44.entities.SpecialDiscount.create(payload);
    }
    resetForm();
    await loadDiscounts();
    setMessage({ text: `Discount code ${code} was ${editingId ? "updated" : "added"}.`, ok: true });
    setSaving(false);
  };

  const toggleField = async (discount, field) => {
    await base44.entities.SpecialDiscount.update(discount.id, { [field]: !discount[field] });
    loadDiscounts();
  };

  const deleteDiscount = async (discount) => {
    await base44.entities.SpecialDiscount.delete(discount.id);
    loadDiscounts();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-primary" /> Special Customer Discounts
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">Create a code here, then send that code to your customer. If you add their email, only that customer can use it.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid md:grid-cols-6 gap-3 items-end">
          <div>
            <Label>Code</Label>
            <Input className="mt-1" placeholder="VIP25" value={form.code} onChange={(e) => updateForm({ code: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Customer Email</Label>
            <Input className="mt-1" placeholder="Optional" value={form.customer_email} onChange={(e) => updateForm({ customer_email: e.target.value })} />
          </div>
          <div>
            <Label>Discount %</Label>
            <Input type="number" className="mt-1" min="1" max="100" value={form.percent_off} onChange={(e) => updateForm({ percent_off: e.target.value })} />
          </div>
          <div>
            <Label>Plan</Label>
            <select className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.plan_type} onChange={(e) => updateForm({ plan_type: e.target.value })}>
              <option value="any">Any</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={saveDiscount} disabled={saving} className="gap-2">
              <Plus className="w-4 h-4" />{saving ? "Saving..." : editingId ? "Update" : "Add"}
            </Button>
            {editingId && (
              <Button variant="outline" size="icon" onClick={resetForm}><X className="w-4 h-4" /></Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
          <Switch checked={form.is_combinable} onCheckedChange={(checked) => updateForm({ is_combinable: checked })} />
          <span className="text-sm text-muted-foreground">New discounts are combinable with other special discounts</span>
        </div>

        {message.text && (
          <p className={`text-sm font-medium ${message.ok ? "text-green-500" : "text-red-500"}`}>{message.text}</p>
        )}

        <div className="space-y-2">
          {discounts.map((discount) => (
            <div key={discount.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{discount.code}</span>
                  <Badge variant="secondary">{discount.percent_off}% OFF</Badge>
                  <Badge variant="outline" className="capitalize">{discount.plan_type || "any"}</Badge>
                  <Badge className={discount.is_combinable !== false ? "bg-green-100 text-green-700 border-0" : "bg-muted text-muted-foreground border-0"}>
                    {discount.is_combinable !== false ? "Combinable" : "Not combinable"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{discount.customer_email || "Any customer"}</p>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Switch checked={discount.is_combinable !== false} onCheckedChange={() => toggleField(discount, "is_combinable")} /> Combine
                </label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Switch checked={discount.is_active} onCheckedChange={() => toggleField(discount, "is_active")} /> Active
                </label>
                <Button variant="ghost" size="icon" onClick={() => startEdit(discount)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => deleteDiscount(discount)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
          {discounts.length === 0 && <p className="text-sm text-muted-foreground">No special discounts yet.</p>}
        </div>
      </CardContent>
    </Card>
  );
}