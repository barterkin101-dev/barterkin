import type { Metadata } from 'next'
import { Leaf, Heart, Users } from 'lucide-react'

import { FadeIn, Stagger, StaggerItem } from '@/components/ui/fade-in'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export const metadata: Metadata = {
  title: 'Behind Barterkin',
  description:
    'Meet the people behind Barterkin. Learn where the movement started and who is building community across Georgia.',
  alternates: { canonical: '/behind-barterkin' },
  openGraph: {
    title: 'Behind Barterkin',
    description:
      'Meet the people behind Barterkin. Learn where the movement started and who is building community across Georgia.',
    url: '/behind-barterkin',
    siteName: 'Barterkin',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Behind Barterkin',
    description:
      'Meet the people behind Barterkin. Learn where the movement started and who is building community across Georgia.',
  },
}

const TEAM = [
  {
    name: 'Kerry Elise',
    role: 'Co-Creator',
    bio: 'Kerry Elise is an herbalist and holistic nutrition educator whose work centers on simple, natural approaches to health and everyday living. Bartering is an extension of that philosophy; rooted in community, mutual support, and recognizing the value of what each person already has to offer. Barterkin is a way to bring those connections to a wider network across Georgia.',
    image: '/team/kerry-elise.jpg',
    initial: 'K',
    icon: Leaf,
  },
  {
    name: 'Naeem',
    role: 'Co-Creator',
    bio: 'Naeem is a systems thinker and builder who believes technology should serve community first. He architects the platform, handles operations, and ensures Barterkin stays fast, secure, and aligned with its mission of connecting Georgians through trade.',
    image: '/team/naeem.jpg',
    initial: 'N',
    icon: Heart,
    placeholder: true,
  },
  {
    name: 'Ashley',
    role: 'Co-Creator',
    bio: 'Ashley brings the voice and vision of Barterkin to life. She shapes the member experience, leads outreach, and makes sure the platform feels welcoming to every Georgian who wants to trade skills and build local connections.',
    image: '/team/ashley.jpg',
    initial: 'A',
    icon: Users,
    placeholder: true,
  },
]

export default function BehindBarterkinPage() {
  return (
    <main id="main" className="mx-auto max-w-5xl px-6 py-12 md:py-20">
      {/* Hero */}
      <section className="mx-auto max-w-3xl text-center">
        <FadeIn>
          <p className="text-xs uppercase tracking-[0.18em] font-bold text-forest-mid">
            About Us
          </p>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h1 className="mt-4 font-serif text-3xl font-bold text-forest-deep sm:text-4xl md:text-5xl leading-[1.1]">
            Behind{' '}
            <em className="not-italic text-clay">Barterkin</em>
          </h1>
        </FadeIn>
        <FadeIn delay={0.2}>
          <p className="mt-6 text-lg text-forest-mid leading-relaxed">
            Every movement has a beginning. Ours started with a belief that
            community is currency — and that Georgia is full of people with
            gifts worth sharing.
          </p>
        </FadeIn>
      </section>

      {/* Origin story */}
      <section className="mt-20 md:mt-28">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:items-center">
          <FadeIn variant="slideInLeft">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-sage-light">
              <div className="absolute inset-0 flex items-center justify-center">
                <Leaf className="h-24 w-24 text-forest/20" aria-hidden="true" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-tr from-forest-deep/10 to-transparent" />
            </div>
          </FadeIn>

          <div>
            <FadeIn delay={0.1}>
              <p className="text-xs uppercase tracking-[0.18em] font-bold text-forest-mid">
                Where it started
              </p>
              <h2 className="mt-3 font-serif text-2xl font-bold text-forest-deep sm:text-3xl">
                Rooted in soil, grown by trust
              </h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-4 text-base text-forest-mid leading-relaxed">
                Barterkin was born from a simple observation: the people who grow
                your food, fix your home, and care for your health are already in
                your county. But there was no easy way to find them — or to offer
                your own skills in return.
              </p>
            </FadeIn>
            <FadeIn delay={0.3}>
              <p className="mt-4 text-base text-forest-mid leading-relaxed">
                We set out to build something different. Not a marketplace that
                takes a cut, but a directory that honors the old tradition of
                barter: mutual aid, face-to-face trust, and the understanding
                that everyone has something of value to trade.
              </p>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* The faces */}
      <section className="mt-20 md:mt-28">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <FadeIn>
            <p className="text-xs uppercase tracking-[0.18em] font-bold text-forest-mid">
              The faces of the movement
            </p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h2 className="mt-3 font-serif text-2xl font-bold text-forest-deep sm:text-3xl">
              Meet the people building Barterkin
            </h2>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="mt-4 text-base text-forest-mid leading-relaxed">
              These are the humans behind the screen — neighbors who believe
              Georgia is stronger when we trade skills instead of just dollars.
            </p>
          </FadeIn>
        </div>

        <Stagger className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {TEAM.map((member) => {
            const Icon = member.icon
            return (
              <StaggerItem key={member.name}>
                <div className="relative flex flex-col items-center rounded-2xl bg-sage-pale p-8 ring-1 ring-sage-light text-center h-full">
                  {/* Photo */}
                  <div className="relative">
                    <Avatar className="h-28 w-28 border-2 border-sage-light">
                      <AvatarImage
                        src={member.placeholder ? undefined : member.image}
                        alt={member.name}
                      />
                      <AvatarFallback className="bg-forest/10 text-forest text-2xl font-serif">
                        {member.initial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-clay text-sage-bg shadow-sm">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                  </div>

                  {/* Name & role */}
                  <h3 className="mt-6 font-serif text-xl font-bold text-forest-deep">
                    {member.name}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-clay">
                    {member.role}
                  </p>

                  {/* Bio */}
                  {member.placeholder ? (
                    <div className="mt-4 flex-1 flex items-center justify-center">
                      <p className="text-sm text-forest-mid/60 italic">
                        Bio coming soon.
                      </p>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-forest-mid leading-relaxed flex-1">
                      {member.bio}
                    </p>
                  )}
                </div>
              </StaggerItem>
            )
          })}
        </Stagger>
      </section>

      {/* Closing CTA */}
      <section className="mt-20 md:mt-28">
        <FadeIn>
          <div className="mx-auto max-w-2xl rounded-2xl bg-forest-deep p-10 text-center md:p-14">
            <h2 className="font-serif text-2xl font-bold text-sage-bg sm:text-3xl">
              You are part of this story too.
            </h2>
            <p className="mt-4 text-base text-sage-light leading-relaxed">
              Barterkin is not just a directory. It is a living network of
              Georgians choosing trust over transactions. Add your skills and
              become a thread in the fabric.
            </p>
            <a
              href="/signup"
              className="mt-8 inline-flex items-center justify-center rounded-lg bg-clay px-7 py-3.5 text-sm font-bold text-sage-bg shadow-sm hover:bg-clay/90 transition-colors"
            >
              Join the directory
            </a>
          </div>
        </FadeIn>
      </section>
    </main>
  )
}
