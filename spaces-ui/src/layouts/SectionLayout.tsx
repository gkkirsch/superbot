import { Outlet } from 'react-router-dom'
import { SecondaryNav } from '@/components/SecondaryNav'
import { secondaryNavItems } from '@/lib/navigation'

interface SectionLayoutProps {
  section: keyof typeof secondaryNavItems
}

export function SectionLayout({ section }: SectionLayoutProps) {
  const items = secondaryNavItems[section] ?? []

  return (
    <>
      <SecondaryNav items={items} />
      <div className="min-h-screen bg-ink">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <Outlet />
        </div>
      </div>
    </>
  )
}
