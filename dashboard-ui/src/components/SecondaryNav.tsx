import { NavLink } from 'react-router-dom'

interface SecondaryNavProps {
  items: { to: string; label: string }[]
}

export function SecondaryNav({ items }: SecondaryNavProps) {
  return (
    <div className="border-b border-border-custom bg-ink sticky top-14 z-40">
      <div className="mx-auto max-w-7xl px-6 flex items-center h-10 gap-1 overflow-x-auto no-scrollbar">
        {items.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-sand/15 text-sand'
                  : 'text-stone hover:text-parchment hover:bg-surface'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </div>
    </div>
  )
}
