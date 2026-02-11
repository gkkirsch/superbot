import { Outlet } from 'react-router-dom'
import { DocsSidebar } from '@/components/DocsSidebar'

export function DocsLayout() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <DocsSidebar />
      <div className="flex-1 overflow-auto bg-ink">
        <div className="mx-auto max-w-4xl px-8 py-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
