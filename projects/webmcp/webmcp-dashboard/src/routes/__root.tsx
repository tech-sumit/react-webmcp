import { createRootRoute, Outlet } from '@tanstack/react-router'
import { Toaster } from '@/components/ui/sonner'
import { PGliteProvider } from '@electric-sql/pglite-react'
import { pg_lite } from '@/lib/db/database'
import type { PGliteWithLive } from '@electric-sql/pglite/live'
import { useMCPNavigationTool } from '@/hooks/useMCPNavigationTool'
import { ThemeProvider } from '@/components/theme-provider'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  useMCPNavigationTool();

  return (
    <ThemeProvider defaultTheme="system" storageKey="webmcp-ui-theme">
      <PGliteProvider db={pg_lite as unknown as PGliteWithLive}>
        <Outlet />
        <Toaster />
        {import.meta.env.DEV && (
          <div className="fixed bottom-2 right-2 z-50">
            <a href="/__tanstack" className="text-xs text-muted-foreground hover:text-foreground bg-background/80 px-2 py-1 rounded border">
              Router DevTools
            </a>
          </div>
        )}
      </PGliteProvider>
    </ThemeProvider>
  )
}
