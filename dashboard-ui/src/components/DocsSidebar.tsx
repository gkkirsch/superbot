import { NavLink } from 'react-router-dom'
import { docsNavItems } from '@/lib/navigation'

export function DocsSidebar() {
  return (
    <nav className="w-60 shrink-0 border-r border-border-custom bg-[hsl(var(--sidebar-background))] overflow-y-auto">
      <div className="py-4 px-3 space-y-4">
        {docsNavItems.map((section, i) => (
          <div key={i}>
            {section.group && (
              <p className="px-3 mb-1.5 text-[10px] font-heading tracking-[0.15em] uppercase text-stone/60">
                {section.group}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(({ to, label, ...rest }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={'end' in rest}
                  className={({ isActive }) =>
                    `block px-3 py-1.5 rounded-md text-sm transition-colors ${
                      isActive
                        ? 'bg-[hsl(var(--sidebar-accent))] text-sand font-medium'
                        : 'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-parchment'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>
    </nav>
  )
}
