'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/members', label: 'Members' },
  { href: '/admin/contacts', label: 'Contacts' },
] as const

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin'
  return pathname.startsWith(href)
}

export function AdminNav() {
  const pathname = usePathname()
  return (
    <nav className="border-b border-sage-light bg-sage-pale">
      <div className="mx-auto max-w-5xl px-6 py-4 flex items-center gap-8">
        <Link
          href="/admin"
          className="font-serif text-xl font-bold text-forest-deep"
        >
          Barterkin Admin
        </Link>
        <ul className="flex items-center gap-6 text-sm">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={
                  isActive(pathname, link.href)
                    ? 'font-bold text-forest-deep'
                    : 'text-forest-mid hover:text-forest-deep'
                }
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <form action="/auth/signout" method="POST" className="ml-auto">
          <button type="submit" className="text-sm text-forest-mid hover:text-forest-deep">
            Sign out
          </button>
        </form>
      </div>
    </nav>
  )
}
