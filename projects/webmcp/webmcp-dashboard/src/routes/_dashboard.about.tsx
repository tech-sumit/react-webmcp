import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getRegisteredTools } from '@/lib/webmcp'
import { useState, useEffect } from 'react'
import type { MCPTool } from '@/lib/webmcp/types'

export const Route = createFileRoute('/_dashboard/about')({
  component: AboutPage,
})

function AboutPage() {
  const [tools, setTools] = useState<MCPTool[]>([])

  useEffect(() => {
    setTools(getRegisteredTools())
    const interval = setInterval(() => setTools(getRegisteredTools()), 2000)
    return () => clearInterval(interval)
  }, [])

  const technologies = [
    { name: 'window.ai', description: 'Chrome\'s built-in AI Prompt API for on-device language model inference', category: 'AI' },
    { name: 'navigator.modelContext', description: 'WebMCP - W3C proposed standard for AI agent tool registration in the browser', category: 'AI' },
    { name: 'React 19', description: 'Frontend UI library with concurrent features', category: 'Frontend' },
    { name: 'TanStack Router', description: 'Type-safe file-based routing for React', category: 'Frontend' },
    { name: 'Tailwind CSS 4', description: 'Utility-first CSS framework', category: 'Frontend' },
    { name: 'shadcn/ui', description: 'Accessible UI components built on Radix primitives', category: 'Frontend' },
    { name: 'PGlite', description: 'PostgreSQL compiled to WebAssembly, running in-browser with IndexedDB persistence', category: 'Database' },
    { name: 'Drizzle ORM', description: 'Lightweight TypeScript ORM with full type inference', category: 'Database' },
    { name: 'Zod', description: 'TypeScript-first schema validation for tool input schemas', category: 'Validation' },
    { name: 'Vite 7', description: 'Fast build tool and development server', category: 'Build' },
  ]

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">WebMCP Dashboard</h1>
          <p className="text-muted-foreground">
            A demonstration of native browser AI APIs: <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">window.ai</code> (Prompt API)
            and <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">navigator.modelContext</code> (WebMCP).
            No polyfills, no cloud services - everything runs in the browser.
          </p>
        </div>

        {/* Architecture */}
        <Card>
          <CardHeader>
            <CardTitle>Architecture</CardTitle>
            <CardDescription>How native browser AI APIs replace the @mcp-b polyfill</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 border">
                <h3 className="font-semibold text-sm mb-2 text-red-500">Before (Polyfill)</h3>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>- @mcp-b/react-webmcp useWebMCP hook</li>
                  <li>- @mcp-b/global polyfill for navigator.modelContext</li>
                  <li>- @mcp-b/embedded-agent web component</li>
                  <li>- Cloud-hosted AI agent backend</li>
                  <li>- Chrome extension required</li>
                </ul>
              </div>
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <h3 className="font-semibold text-sm mb-2 text-green-500">After (Native)</h3>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>- useModelContext hook (direct API)</li>
                  <li>- Native navigator.modelContext (W3C proposal)</li>
                  <li>- useWindowAI hook (Chrome Prompt API)</li>
                  <li>- On-device AI inference</li>
                  <li>- No extension needed</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registered Tools */}
        <Card>
          <CardHeader>
            <CardTitle>Registered Tools ({tools.length})</CardTitle>
            <CardDescription>
              Tools registered via useModelContext (navigator.modelContext.addTool)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tools.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tools registered yet. Navigate to other pages to see tools appear.</p>
            ) : (
              <div className="grid gap-2">
                {tools.map((tool) => (
                  <div key={tool.name} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                    <Badge variant="outline" className="font-mono text-xs shrink-0">{tool.name}</Badge>
                    <p className="text-xs text-muted-foreground line-clamp-2">{tool.description}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Technologies */}
        <Card>
          <CardHeader>
            <CardTitle>Technology Stack</CardTitle>
            <CardDescription>Zero-infrastructure, browser-native architecture</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2">
              {technologies.map((tech) => (
                <div key={tech.name} className="flex items-start gap-3 p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{tech.name}</span>
                      <Badge variant="secondary" className="text-[10px]">{tech.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{tech.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
