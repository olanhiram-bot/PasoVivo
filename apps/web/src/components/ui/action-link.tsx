import { Button } from '@/components/ui/button'
import Link from 'next/link'

type ActionLinkProps = {
  href: string
  label: string
  kind: 'primary' | 'secondary'
}

export function ActionLink({ href, label, kind }: ActionLinkProps) {
  return (
    <Button asChild variant={kind === 'primary' ? 'default' : 'outline'}>
      <Link href={href}>{label}</Link>
    </Button>
  )
}
