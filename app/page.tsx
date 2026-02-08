import { Navbar } from "@/components/landing/navbar"
import { Hero } from "@/components/landing/hero"
import { MarqueeBand } from "@/components/landing/marquee-band"
import { Features } from "@/components/landing/features"
import { HowItWorks } from "@/components/landing/how-it-works"
import { Stats } from "@/components/landing/stats"
import { Testimonials } from "@/components/landing/testimonials"
import { Pricing } from "@/components/landing/pricing"
import { CTA } from "@/components/landing/cta"
import { Footer } from "@/components/landing/footer"

export default function Page() {
  return (
    <main>
      <Navbar />
      <Hero />
      <MarqueeBand />
      <Features />
      <HowItWorks />
      <Stats />
      <Testimonials />
      <Pricing />
      <CTA />
      <Footer />
    </main>
  )
}
