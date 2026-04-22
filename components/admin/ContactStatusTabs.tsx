'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'bounced', label: 'Bounced' },
  { value: 'failed', label: 'Failed' },
] as const

interface ContactStatusTabsProps {
  activeStatus: string
}

export function ContactStatusTabs({ activeStatus }: ContactStatusTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const active = activeStatus && activeStatus !== '' ? activeStatus : 'all'

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('status')
    } else {
      params.set('status', value)
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <Tabs value={active} onValueChange={handleChange}>
      <TabsList className="bg-sage-pale">
        {TABS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="data-[state=active]:bg-sage-light data-[state=active]:text-forest-deep"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
