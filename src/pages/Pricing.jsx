import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CheckCircle, Tag, Zap, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const LOGO_URL = "https://media.base44.com/images/public/6a0b3929bdfa692726f9ff18/74b6eb74e_image.png";

export default function Pricing() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutPlanId, setCheckoutPlanId] = useState(null);
  const [discountCode, setDiscountCode] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [manualPlan, setManualPlan] = useState(null);
  const [manualSubmitted, setManualSubmitted] = useState(false);
  const checkoutStatus = new URLSearchParams(window.location.search).get("checkout");

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

  const handleCheckout = async (plan) => {
    if ((plan.payment_method || "stripe") !== "stripe") {
      setManualPlan(plan);
      setManualSubmitted(false);
      return;
    }

    if (window.self !== window.top) {
      alert("Checkout works only from the published app. Please publish and open the app in a new tab to test payments.");
      return;
    }

    setCheckoutPlanId(plan.id);
    const response = await base44.functions.invoke("createCheckoutSession", {
      priceId: plan.stripe_price_id,
      planId: plan.id,
      planType: plan.plan_type,
      discountCode: discountCode.trim().toUpperCase(),
      email: customerEmail.trim().toLowerCase()
    });
    window.location.href = response.data.url;
  };

  const submitManualPayment = async () => {
    if (!manualPlan || !customerEmail.trim()) return;
    await base44.functions.invoke("createManualPayment", {
      planId: manualPlan.id,
      planType: manualPlan.plan_type,
      email: customerEmail.trim().toLowerCase(),
      amount: manualPlan.price,
      paymentMethod: manualPlan.payment_method || "manual",
      paymentHandle: manualPlan.payment_handle || "",
      paymentNote: manualPlan.payment_instructions || ""
    });
    setManualSubmitted(true);
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
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          ← Back to Home
        </Link>
        <div className="text-center mb-14">
          <Badge className="mb-4 bg-primary/10 text-primary border-0">Pricing</Badge>
          <h1 className="font-display text-5xl font-bold text-foreground mb-4">Invest in your 5</h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto">
            Full access to all courses, unlimited practice exams, and adaptive coaching.
          </p>
        </div>

        {checkoutStatus === "success" && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Payment successful. Your access is being activated.
          </div>
        )}
        {checkoutStatus === "cancelled" && (
          <div className="mb-6 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            Checkout was cancelled. You can choose a plan whenever you're ready.
          </div>
        )}

        <div className="mb-8 grid gap-4 max-w-3xl mx-auto">
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-5">
              <h2 className="font-display text-lg font-semibold text-foreground mb-3">How payment works</h2>
              <div className="grid sm:grid-cols-4 gap-3 text-sm">
                {["Choose a plan", "Enter any code", "Pay securely", "Access is activated"].map((step, index) => (
                  <div key={step} className="rounded-xl bg-muted/40 p-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold mb-2">{index + 1}</div>
                    <p className="font-medium text-foreground">{step}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">Have a discount code?</h2>
                <p className="text-sm text-muted-foreground">Enter the customer email and code provided by the admin or tutor.</p>
              </div>
              <Badge variant="secondary">Optional</Badge>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">Customer email</label>
                <input className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm" placeholder="you@email.com" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Discount code</label>
                <input className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm uppercase" placeholder="VIP25" value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} />
              </div>
            </div>
          </div>
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
                    <Button
                      className={`w-full ${style.cta}`}
                      disabled={((plan.payment_method || "stripe") === "stripe" && !plan.stripe_price_id) || checkoutPlanId === plan.id}
                      onClick={() => handleCheckout(plan)}
                    >
                      {checkoutPlanId === plan.id ? "Opening checkout..." : (plan.payment_method || "stripe") === "stripe" ? "Start 7-day trial" : "Subscribe"}
                    </Button>
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

      <Dialog open={!!manualPlan} onOpenChange={() => setManualPlan(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{manualPlan?.plan_name} Payment Instructions</DialogTitle>
          </DialogHeader>
          {manualPlan && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <p className="text-sm"><span className="font-medium">Payment method:</span> <span className="capitalize">{manualPlan.payment_method || "manual"}</span></p>
                {manualPlan.payment_handle && <p className="text-sm"><span className="font-medium">Payment handle:</span> {manualPlan.payment_handle}</p>}
                {manualPlan.payment_instructions && <p className="text-sm whitespace-pre-wrap">{manualPlan.payment_instructions}</p>}
              </div>
              {!manualSubmitted ? (
                <>
                  {!customerEmail.trim() && <p className="text-sm text-destructive">Please enter your email above before submitting.</p>}
                  <Button className="w-full" onClick={submitManualPayment} disabled={!customerEmail.trim()}>
                    I sent the payment
                  </Button>
                </>
              ) : (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                  Payment request submitted. Your subscription will be activated after admin confirmation.
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}