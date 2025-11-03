import { ArrowRight } from "lucide-react"

export default function CTA() {
  return (
    <section className="relative overflow-hidden px-4 py-20 sm:py-32">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-1/3 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-2xl text-center">
        <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">Ready to revolutionize your payments?</h2>
        <p className="mb-8 text-lg text-muted-foreground leading-relaxed">
          Join hundreds of developers building the future of payments with Solana and Sol Pay.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row items-center justify-center">
          <button className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary via-primary to-accent px-6 py-3 font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            Get Started for Free
            <ArrowRight className="h-4 w-4" />
          </button>
          <button className="rounded-lg border border-border px-6 py-3 font-medium text-foreground hover:bg-card transition-colors">
            Schedule a Demo
          </button>
        </div>
      </div>
    </section>
  )
}
