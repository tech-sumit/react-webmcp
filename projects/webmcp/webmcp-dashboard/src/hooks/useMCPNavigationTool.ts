import { z } from 'zod';
import { useModelContext } from '@/lib/webmcp';
import { useRouter } from '@tanstack/react-router';
import { useMemo } from 'react';
import { toast } from 'sonner';

const ROUTE_DEFINITIONS = [
  { path: '/dashboard', name: 'Dashboard', description: 'Main dashboard with stats, charts, and overview' },
  { path: '/entities', name: 'Entities', description: 'Memory entities - structured knowledge items' },
  { path: '/memory-blocks', name: 'Memory Blocks', description: 'Always-in-context memory blocks' },
  { path: '/sql-repl', name: 'SQL REPL', description: 'Interactive SQL terminal for PGlite' },
  { path: '/about', name: 'About', description: 'Technology stack and project information' },
] as const;

function formatRouteList(): string {
  return ROUTE_DEFINITIONS.map(r => `- ${r.path}: ${r.name} - ${r.description}`).join('\n');
}

export function useMCPNavigationTool() {
  const router = useRouter();
  const routeListDescription = useMemo(() => formatRouteList(), []);

  useModelContext({
    name: 'navigate',
    description: `Navigate to a different route in the application.\n\nAvailable routes:\n${routeListDescription}`,
    inputSchema: {
      to: z.string().min(1).describe('The route path to navigate to'),
      replace: z.boolean().optional().default(false).describe('Replace current history entry'),
    },
    handler: async (input) => {
      const to = input.to as string;
      const replace = input.replace as boolean;
      try {
        await router.navigate({ to, replace });
        toast.success(`Navigated to ${to}`);
        return { success: true, navigated_to: to };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error(`Navigation failed: ${msg}`);
        return { success: false, error: msg };
      }
    },
  });

  useModelContext({
    name: 'get_current_context',
    description: 'Get the current page context including URL and available routes',
    inputSchema: {},
    handler: async () => {
      return {
        current_path: router.state.location.pathname,
        available_routes: ROUTE_DEFINITIONS,
      };
    },
  });
}
