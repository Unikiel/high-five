import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { CreditCard, Plus, Edit2, Trash2, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import BackLink from "@/components/BackLink";
import SpecialDiscountManager from "@/components/admin/SpecialDiscountManager";

const DEFAULT_PLANS = [
  { plan_name: "Weekly", plan_type: "weekly", price: 9.99, original_price: 9.99, discount_percent: 0, is_active: true, features: ["All 10 AP Courses", "Unlimited Practice Exams", "AI-Adaptive Questions", "Progress Tracking"] },
  { plan_name: "Monthly", plan_type: "monthly", price: 29.99, original_price: 39.99, discount_percent: 25, is_active: true, features: ["All 10 AP Courses", "Unlimited Practice Exams", "AI-Adaptive Questions", "Progress Tracking", "1 Tutoring Session/mo"] },
  { plan_name: "Yearly", plan_type: "yearly", price: 199.99, original_price: 479.88, discount_percent: 58, is_active: true, features: ["All 10 AP Courses", "Unlimited Practice Exams", "AI-Adaptive Questions", "Progress Tracking", "4 Tutoring Sessions/mo", "Priority Support"] },
];

export default function AdminBilling() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [editingPlan, setEditingPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadPlans(); }, []);

  const loadPlans = async () => {
    try {
      const p = await base44.entities.Subscription.list();
      if (p.length === 0) {
        // Seed default plans
        for (const plan of DEFAULT_PLANS) {
          await base44.entities.Subscription.create(plan);
        }
        const p2 = await base44.entities.Subscription.list();
        setPlans(p2);
      } else {
        setPlans(p);
      }
    } catch (e) {}
    setLoading(false);
  };

  const calculateDiscount = (price, originalPrice) => {
    if (!originalPrice || originalPrice <= price) return 0;
    return Math.round(((originalPrice - price) / originalPrice) * 100);
  };

  const handleSave = async () => {
    if (!editingPlan) return;
    const planToSave = {
      ...editingPlan,
      discount_percent: calculateDiscount(Number(editingPlan.price), Number(editingPlan.original_price))
    };
    try {
      if (planToSave.id) {
        await base44.entities.Subscription.update(planToSave.id, planToSave);
      } else {
        await base44.entities.Subscription.create(planToSave);
      }
      setEditingPlan(null);
      loadPlans();
    } catch (e) {}
  };

  const toggleActive = async (plan) => {
    try {
      await base44.entities.Subscription.update(plan.id, { is_active: !plan.is_active });
      loadPlans();
    } catch (e) {}
  };

  if (user && user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  const PLAN_COLORS = { weekly: "text-blue-500", monthly: "text-purple-500", yearly: "text-green-500" };
  const PLAN_BG = { weekly: "border-blue-200 dark:border-blue-800", monthly: "border-purple-200 dark:border-purple-800", yearly: "border-green-200 dark:border-green-800" };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <BackLink to="/admin" label="Back to Admin" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Subscription Plans</h1>
          <p className="text-muted-foreground mt-1">Manage pricing plans and discounts</p>
        </div>
        <Button onClick={() => setEditingPlan({ plan_name: "", plan_type: "monthly", price: 0, original_price: 0, discount_percent: 0, is_active: true, features: [] })} className="gap-2">
          <Plus className="w-4 h-4" />Add Plan
        </Button>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-3 gap-6">{[1,2,3].map(i => <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map(plan => (
            <Card key={plan.id} className={`border-2 ${PLAN_BG[plan.plan_type] || "border-border"} ${!plan.is_active ? "opacity-60" : ""}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className={`font-display text-xl font-bold ${PLAN_COLORS[plan.plan_type] || "text-foreground"}`}>{plan.plan_name}</h3>
                    <p className="text-sm text-muted-foreground capitalize">{plan.plan_type}</p>
                  </div>
                  <Switch checked={plan.is_active} onCheckedChange={() => toggleActive(plan)} />
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-3xl font-bold text-foreground">${plan.price}</span>
                    {plan.plan_type !== "weekly" && (
                      <span className="text-sm text-muted-foreground">/{plan.plan_type === "monthly" ? "mo" : "yr"}</span>
                    )}
                  </div>
                  {plan.discount_percent > 0 && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-muted-foreground line-through">${plan.original_price}</span>
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400 border-0 text-xs">
                        <Tag className="w-3 h-3 mr-1" />{plan.discount_percent}% OFF
                      </Badge>
                    </div>
                  )}
                </div>

                <ul className="space-y-2 mb-6">
                  {(plan.features || []).map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className={`w-1.5 h-1.5 rounded-full ${PLAN_COLORS[plan.plan_type]?.replace("text-", "bg-") || "bg-primary"}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setEditingPlan({ ...plan })}>
                  <Edit2 className="w-3.5 h-3.5" />Edit Plan
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SpecialDiscountManager />

      {/* Edit Dialog */}
      <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPlan?.id ? "Edit Plan" : "New Plan"}</DialogTitle>
          </DialogHeader>
          {editingPlan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Plan Name</Label>
                  <Input className="mt-1" value={editingPlan.plan_name} onChange={e => setEditingPlan(p => ({ ...p, plan_name: e.target.value }))} />
                </div>
                <div>
                  <Label>Type</Label>
                  <select className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={editingPlan.plan_type} onChange={e => setEditingPlan(p => ({ ...p, plan_type: e.target.value }))}>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Price ($)</Label>
                  <Input type="number" className="mt-1" value={editingPlan.price} onChange={e => setEditingPlan(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <Label>Original ($)</Label>
                  <Input type="number" className="mt-1" value={editingPlan.original_price} onChange={e => setEditingPlan(p => ({ ...p, original_price: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <Label>Discount %</Label>
                  <div className="mt-1 h-9 rounded-md border border-input bg-muted px-3 flex items-center text-sm font-medium">
                    {calculateDiscount(Number(editingPlan.price), Number(editingPlan.original_price))}%
                  </div>
                </div>
              </div>
              <div>
                <Label>Features (one per line)</Label>
                <textarea
                  className="mt-1 w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                  value={(editingPlan.features || []).join("\n")}
                  onChange={e => setEditingPlan(p => ({ ...p, features: e.target.value.split("\n").filter(Boolean) }))}
                />
              </div>
              <Button className="w-full" onClick={handleSave}>Save Plan</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}