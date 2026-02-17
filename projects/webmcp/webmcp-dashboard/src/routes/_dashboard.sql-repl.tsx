import { createFileRoute } from '@tanstack/react-router'
import { Terminal, Play } from 'lucide-react'
import { pg_lite, db } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useMCPSQLTool } from '@/hooks/useMCPSQLTool'

export const Route = createFileRoute('/_dashboard/sql-repl')({
  component: SQLReplPage,
})

function SQLReplPage() {
  useMCPSQLTool()

  const [query, setQuery] = useState('SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\' ORDER BY table_name;')
  const [results, setResults] = useState<{ rows: any[]; fields: string[]; time: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const executeQuery = async () => {
    if (!query.trim() || isExecuting) return
    setIsExecuting(true)
    setError(null)
    setResults(null)

    const startTime = performance.now()
    try {
      const result = await pg_lite.query(query)
      const executionTime = Math.round(performance.now() - startTime)

      setResults({
        rows: result.rows,
        fields: result.fields?.map(f => f.name) || [],
        time: executionTime,
      })

      setHistory(prev => [query, ...prev.slice(0, 19)])

      try {
        await db.insert(schema.sql_execution_log).values({
          query,
          source: 'manual',
          success: true,
          rows_affected: result.rows.length,
          result_data: { rows: result.rows.slice(0, 50), fields: result.fields?.map(f => ({ name: f.name })) },
          execution_time_ms: executionTime,
        })
      } catch { /* ignore logging errors */ }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      const executionTime = Math.round(performance.now() - startTime)
      try {
        await db.insert(schema.sql_execution_log).values({
          query,
          source: 'manual',
          success: false,
          error_message: msg,
          execution_time_ms: executionTime,
        })
      } catch { /* ignore logging errors */ }
    } finally {
      setIsExecuting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      executeQuery()
    }
  }

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  return (
    <div className="flex flex-col h-full min-w-0 bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b px-4 md:px-6 py-2.5">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-lg md:text-xl font-bold">SQL REPL</h1>
            <p className="text-xs text-muted-foreground">PostgreSQL via PGlite (in-browser) - Tools registered via navigator.modelContext</p>
          </div>
        </div>
      </div>

      {/* Query Input */}
      <div className="flex-shrink-0 border-b p-4">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 min-h-[80px] bg-background border rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            placeholder="Enter SQL query..."
          />
          <Button onClick={executeQuery} disabled={isExecuting || !query.trim()} className="self-end">
            <Play className="h-4 w-4 mr-1" />
            Run
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Press Cmd+Enter to execute</p>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto p-4">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 mb-4">
            <p className="text-sm text-destructive font-mono">{error}</p>
          </div>
        )}

        {results && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline">{results.rows.length} rows</Badge>
              <Badge variant="secondary">{results.time}ms</Badge>
            </div>

            {results.rows.length > 0 ? (
              <div className="border rounded-md overflow-auto max-h-[60vh]">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      {results.fields.map((field) => (
                        <th key={field} className="px-3 py-2 text-left font-medium text-xs border-b whitespace-nowrap">
                          {field}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.rows.slice(0, 100).map((row, i) => (
                      <tr key={i} className="border-b hover:bg-muted/30">
                        {results.fields.map((field) => (
                          <td key={field} className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                            {row[field] === null ? (
                              <span className="text-muted-foreground italic">null</span>
                            ) : typeof row[field] === 'object' ? (
                              JSON.stringify(row[field])
                            ) : (
                              String(row[field])
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Query executed successfully (no rows returned)</p>
            )}
          </div>
        )}

        {!results && !error && (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Terminal className="h-8 w-8 mb-2 opacity-20" />
            <p className="text-sm">Enter a query and press Run or Cmd+Enter</p>
          </div>
        )}
      </div>
    </div>
  )
}
