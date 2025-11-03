import { CheckCircle2 } from "lucide-react"

const plans = [
  {
    name: "Starter",
    description: "Perfect for getting started",
    price: "$0",
    period: "forever free",
    features: [
      "Up to 100 transactions/month",
      "Basic analytics",
      "Email support",
      "Standard API access",
      "Community support",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Professional",
    description: "For growing businesses",
    price: "1.5%",
    period: "per transaction",
    features: [
      "Unlimited transactions",
      "Advanced analytics",
      "Priority email support",
      "Premium API access",
      "Webhook integrations",
      "Custom branding",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    description: "For large-scale operations",
    price: "Custom",
    period: "volume-based pricing",
    features: [
      "All Professional features",
      "24/7 dedicated support",
      "Custom integration",
      "SLA guarantee",
      "Advanced security",
      "Custom features",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
]

export default function Pricing() {
  return (
    <section id="pricing" className="px-4 py-20 sm:py-32 border-y border-border">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-4 text-center text-3xl font-bold text-foreground sm:text-4xl">Simple, transparent pricing</h2>
        <p className="mx-auto mb-16 max-w-2xl text-center text-muted-foreground">
          Choose the plan that fits your needs. Scale as you grow.
        </p>

        <div className="grid gap-8 sm:grid-cols-3 lg:gap-6">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`rounded-xl border p-8 transition-all ${
                plan.highlighted
                  ? "border-accent bg-gradient-to-b from-card to-background shadow-xl shadow-primary/10"
                  : "border-border bg-card hover:border-accent/50"
              }`}
            >
              {plan.highlighted && (
                <div className="mb-4 inline-block rounded-full bg-accent/20 px-3 py-1 border border-accent/30">
                  <span className="text-xs font-semibold text-accent uppercase tracking-wide">Popular</span>
                </div>
              )}

              <h3 className="mb-2 text-xl font-bold text-foreground">{plan.name}</h3>
              <p className="mb-6 text-sm text-muted-foreground">{plan.description}</p>

              <div className="mb-6">
                <div className="text-4xl font-bold text-foreground">{plan.price}</div>
                <p className="text-sm text-muted-foreground">{plan.period}</p>
              </div>

              <button
                className={`mb-8 w-full rounded-lg px-4 py-2.5 font-medium transition-all ${
                  plan.highlighted
                    ? "bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
                    : "border border-border text-foreground hover:bg-background"
                }`}
              >
                {plan.cta}
              </button>

              <div className="space-y-3 border-t border-border pt-6">
                {plan.features.map((feature, fidx) => (
                  <div key={fidx} className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-accent mt-0.5" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
