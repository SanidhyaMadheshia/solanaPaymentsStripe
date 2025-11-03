import { CheckCircle2 } from "lucide-react"

const benefits = [
  "Instant payment confirmations",
  "Support for multiple Solana tokens",
  "Wallet integration built-in",
  "Developer-friendly API",
  "Real-time analytics dashboard",
  "Enterprise security features",
]

export default function Benefits() {
  return (
    <section className="px-4 py-20 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
              Everything you need to accept Solana payments
            </h2>
            <p className="mb-8 text-muted-foreground leading-relaxed">
              Build powerful payment experiences with our comprehensive suite of tools and integrations. From checkout
              flows to recurring billing, we've got you covered.
            </p>
            <div className="space-y-3">
              {benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-accent" />
                  <span className="text-foreground">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-8">
            <div className="space-y-6">
              <div className="rounded-lg bg-background p-4 border border-border">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                    <span className="text-xs font-medium text-accent">Live</span>
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">250 SOL</p>
                <p className="text-sm text-muted-foreground">$42,500 USD</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Network</span>
                  <span className="text-foreground font-medium">Solana Mainnet</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fee</span>
                  <span className="text-foreground font-medium">$0.00025</span>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="flex justify-between">
                  <span className="text-foreground font-medium">You receive</span>
                  <span className="font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    250 SOL
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
