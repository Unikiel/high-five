import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CheckCircle, Tag, Zap, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const LOGO_URL = "https://media.base44.com/images/public/6a0b3929bdfa692726f9ff18/1cab3125e_generated_image.png";

export default function Pricing() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Subscription.filter({ is_active: true })
      .then(p => setPlans(p.sort((a, b) => {
        const order = { weekly: 0, monthly: 1, yearly: 2 };
        return order[a.plan_type] - order[b.plan_type];
      })))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const PLAN_STYLES = {
    weekly: { border: "border-border", header: "bg-muted/50", badge: null, cta: "bg-foreground text-background hover:bg-foreground/90" },
    monthly: { border: "border-primary ring-2 ring-primary/20", header: "bg-primary text-white", badge: "Most Popular", cta: "bg-primary hover:bg-primary/90 text-white" },
    yearly: { border: "border-green-500 ring-2 ring-green-500/20", header: "bg-green-600 text-white", badge: "Best Value", cta: "bg-green-600 hover:bg-green-700 text-white" },
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={LOGO_URL} alt="High Five" className="w-8 h-8 rounded-lg" />
          <span className="font-display font-bold text-foreground">High Five</span>
        </Link>
        <div className="flex gap-3">
          <Link to="/login"><Button variant="outline" size="sm">Sign In</Button></Link>
          <Link to="/register"><Button size="sm">Get Started</Button></Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-14">
          <Badge className="mb-4 bg-primary/10 text-primary border-0">Pricing</Badge>
          <h1 className="font-display text-5xl font-bold text-foreground mb-4">Invest in your 5</h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto">
            Full access to all 10 courses, unlimited practice exams, and adaptive AI coaching.
          </p>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="h-96 bg-muted animate-pulse rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6 items-start">
            {plans.map(plan => {
              const style = PLAN_STYLES[plan.plan_type] || PLAN_STYLES.weekly;
              return (
                <Card key={plan.id} className={`border-2 ${style.border} overflow-hidden`}>
                  <div className={`px-6 py-5 ${style.header}`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-xl font-bold">{plan.plan_name}</h3>
                      {style.badge && (
                        <Badge className="bg-white/20 text-current border-0 text-xs">{style.badge}</Badge>
                      )}
                    </div>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-4xl font-display font-bold">${plan.price}</span>
                      <span className="opacity-70 text-sm">/{plan.plan_type === "weekly" ? "week" : plan.plan_type === "monthly" ? "month" : "year"}</span>
                    </div>
                    {plan.discount_percent > 0 && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-sm opacity-60 line-through">${plan.original_price}</span>
                        <span className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full">
                          <Tag className="w-3 h-3 inline mr-0.5" />{plan.discount_percent}% OFF
                        </span>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-6">
                    <ul className="space-y-3 mb-6">
                      {(plan.features || []).map((f, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link to="/register">
                      <Button className={`w-full ${style.cta}`}>
                        Get Started
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground mt-10">
          All plans include a 7-day free trial. Cancel anytime.
        </p>
      </div>
    </div>
  );
}