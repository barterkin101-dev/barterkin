import { Navbar } from '@/components/Navbar'
import { Hero } from '@/components/Hero'
import { HowItWorks } from '@/components/HowItWorks'
import { FoundingMember } from '@/components/FoundingMember'
import { Counties } from '@/components/Counties'
import { Faq } from '@/components/Faq'
import { CtaFooter } from '@/components/CtaFooter'

export default function App() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <FoundingMember />
        <Counties />
        <Faq />
        <CtaFooter />
      </main>
    </div>
  )
}
