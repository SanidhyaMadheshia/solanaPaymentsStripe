import Header from "./header"
import Hero from "./hero"
import Features from "./features"
import Stats from "./stats"
import Benefits from "./benefits"
import Pricing from "./pricing"
import CTA from "./cta"
import Footer from "./footer"

export default function Landing() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <Hero />
      <Features />
      <Stats />
      <Benefits />
      <Pricing />
      <CTA />
      <Footer />
    </main>
  )
}
