import { createFileRoute } from '@tanstack/react-router'
import { Database, Plus, Lightbulb, Heart, Code, AlertCircle, User, FolderOpen, Target, BookOpen, type LucideIcon } from 'lucide-react'
import { useLiveQuery } from '@electric-sql/pglite-react'
import { memory_entities } from '@/lib/db'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMCPEntityTools } from '@/hooks/useMCPEntityTools'

export const Route = createFileRoute('/_dashboard/entities')({
  component: EntitiesComponent,
})

const categoryIcons: Record<string, { icon: LucideIcon; color: string }> = {
  fact: { icon: Lightbulb, color: 'text-yellow-500' },
  preference: { icon: Heart, color: 'text-pink-500' },
  skill: { icon: Code, color: 'text-green-500' },
  rule: { icon: AlertCircle, color: 'text-red-500' },
  context: { icon: BookOpen, color: 'text-blue-500' },
  person: { icon: User, color: 'text-purple-500' },
  project: { icon: FolderOpen, color: 'text-orange-500' },
  goal: { icon: Target, color: 'text-cyan-500' },
}

function EntitiesComponent() {
  useMCPEntityTools()

  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const entitiesQuery = memory_entities.getAllMemoryEntitiesQuerySQL()
  const entitiesResult = useLiveQuery<memory_entities.GetAllMemoryEntitiesResult>(entitiesQuery.sql, entitiesQuery.params)

  const categoryCountsQuery = memory_entities.getMemoryEntityCategoryCountsQuerySQL()
  const categoryCountsResult = useLiveQuery<memory_entities.GetMemoryEntityCategoryCountsResult>(categoryCountsQuery.sql, categoryCountsQuery.params)

  const entities = entitiesResult?.rows ?? []
  const categoryCounts = categoryCountsResult?.rows ?? []

  const filteredEntities = selectedCategory === 'all'
    ? entities
    : entities.filter((entity) => entity.category === selectedCategory)

  return (
    <div className="h-full w-full min-w-0 flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-card px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg md:text-xl font-bold flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Entities
            </h1>
            <p className="text-xs text-muted-foreground mt-1">Structured knowledge via navigator.modelContext</p>
          </div>
          <Badge variant="outline">{entities.length} total</Badge>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex-shrink-0 border-b px-4 md:px-6 py-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent'
            }`}
          >
            All ({entities.length})
          </button>
          {Object.entries(categoryIcons).map(([category, { icon: Icon }]) => {
            const count = categoryCounts.find((c) => c.category === category)?.count ?? 0
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  selectedCategory === category
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent'
                }`}
              >
                <Icon className="h-3 w-3" />
                {category} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Entity Cards */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {filteredEntities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Database className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-sm">No entities found</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredEntities.map((entity) => {
              const catInfo = categoryIcons[entity.category] || { icon: Database, color: 'text-gray-500' }
              const Icon = catInfo.icon
              return (
                <Card key={entity.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${catInfo.color}`} />
                        <CardTitle className="text-sm font-medium truncate">{entity.name}</CardTitle>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {entity.category}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{entity.description}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {entity.tags?.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {tag}
                        </Badge>
                      ))}
                      <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                        <span>tier: {entity.memory_tier}</span>
                        <span>score: {entity.importance_score}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
