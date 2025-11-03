import { Zap, Lock, TrendingUp } from "lucide-react"

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Settle transactions in seconds. No more waiting for confirmations or delayed settlements.",
  },
  {
    icon: Lock,
    title: "Secure & Transparent",
    description: "Built on Solana blockchain with immutable records. Full transparency for every transaction.",
  },
  {
    icon: TrendingUp,
    title: "Low Fees",
    description:
      "Minimal transaction costs mean more revenue for your business. Typical fees under $0.01 per transaction.",
  },
]

export default function Features() {
  return (
    <section id="features" className="px-4 py-20 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-4 text-center text-3xl font-bold text-foreground sm:text-4xl">Why choose Sol Pay?</h2>
        <p className="mx-auto mb-16 max-w-2xl text-center text-muted-foreground">
          Built for the modern web with cutting-edge blockchain technology
        </p>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, idx) => {
            const Icon = feature.icon
            return (
              <div
                key={idx}
                className="rounded-xl border border-border bg-card p-6 hover:border-accent/50 transition-colors group"
              >
                <div className="mb-4 inline-block rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 p-3 group-hover:from-primary/30 group-hover:to-accent/30 transition-colors">
                  <Icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
