import { createFileRoute } from '@tanstack/react-router'
import { Brain } from 'lucide-react'
import { useLiveQuery } from '@electric-sql/pglite-react'
import { memory_blocks } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useMCPMemoryBlockTools } from '@/hooks/useMCPMemoryBlockTools'

export const Route = createFileRoute('/_dashboard/memory-blocks')({
  component: MemoryBlocksComponent,
})

const typeColors: Record<string, string> = {
  user_profile: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  agent_persona: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  current_goals: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  context: 'bg-green-500/10 text-green-600 border-green-500/20',
}

function MemoryBlocksComponent() {
  useMCPMemoryBlockTools()

  const blocksQuery = memory_blocks.getAllMemoryBlocksQuerySQL()
  const blocksResult = useLiveQuery<memory_blocks.GetAllMemoryBlocksResult>(blocksQuery.sql, blocksQuery.params)
  const blocks = blocksResult?.rows ?? []

  return (
    <div className="h-full w-full min-w-0 flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-card px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg md:text-xl font-bold flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Memory Blocks
            </h1>
            <p className="text-xs text-muted-foreground mt-1">Always-in-context memory managed via navigator.modelContext</p>
          </div>
          <Badge variant="outline">{blocks.length} blocks</Badge>
        </div>
      </div>

      {/* Memory Blocks Grid */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Brain className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-sm">No memory blocks yet</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {blocks.map((block) => (
              <Card key={block.id} className={`border ${typeColors[block.block_type] || ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{block.label}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {block.block_type.replace('_', ' ')}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        P{block.priority}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="text-xs">
                    {block.token_cost} tokens / {block.char_limit} char limit
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap line-clamp-4">
                    {block.value}
                  </p>
                  {block.metadata && Object.keys(block.metadata).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {Object.entries(block.metadata).map(([key, val]) => (
                        <Badge key={key} variant="secondary" className="text-[10px]">
                          {key}: {String(val)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
