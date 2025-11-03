import { ArrowRight } from "lucide-react"

export default function Hero() {
  return (
    <section className="relative overflow-hidden px-4 py-20 sm:py-32 lg:py-40">
      {/* Background gradient effect */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-6 inline-block rounded-full bg-accent/10 px-4 py-1.5 border border-accent/20">
          <span className="text-sm font-medium text-accent">The future of payments</span>
        </div>

        <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Lightning-fast payments
          <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            powered by Solana
          </span>
        </h1>

        <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground leading-relaxed">
          Sol Pay brings next-generation payment technology to your business. Fast settlements, minimal fees, and
          complete transparency on the world's fastest blockchain.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row items-center justify-center">
          <button className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary via-primary to-accent px-6 py-3 font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            Start Building
            <ArrowRight className="h-4 w-4" />
          </button>
          <button className="rounded-lg border border-border px-6 py-3 font-medium text-foreground hover:bg-card transition-colors">
            View Docs
          </button>
        </div>
      </div>
    </section>
  )
}
