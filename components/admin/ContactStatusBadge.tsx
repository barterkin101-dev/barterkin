import { Badge } from '@/components/ui/badge'

interface ContactStatusBadgeProps {
  status: 'sent' | 'delivered' | 'bounced' | 'complained' | 'failed'
}

export function ContactStatusBadge({ status }: ContactStatusBadgeProps) {
  switch (status) {
    case 'bounced':
      return (
        <Badge className="bg-destructive/10 text-destructive border border-destructive/20">
          Bounced
        </Badge>
      )
    case 'failed':
      return (
        <Badge className="bg-destructive/10 text-destructive border border-destructive/20">
          Failed
        </Badge>
      )
    case 'complained':
      return (
        <Badge className="bg-destructive/10 text-destructive border border-destructive/20">
          Complained
        </Badge>
      )
    case 'delivered':
      return <Badge variant="outline">Delivered</Badge>
    case 'sent':
    default:
      return <Badge variant="secondary">Sent</Badge>
  }
}
