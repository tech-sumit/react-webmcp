import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Brain, Database, Network, Activity } from 'lucide-react'
import { useLiveQuery } from '@electric-sql/pglite-react'
import { memory_blocks, memory_entities, entity_relationships, conversation_sessions } from '@/lib/db'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { ChatPanel } from '@/components/chat-panel'

export const Route = createFileRoute('/_dashboard/dashboard')({
  component: DashboardHome,
})

const ENTITY_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#14b8a6'];
const TIER_COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#6b7280'];

function DashboardHome() {
  const blocksQuery = memory_blocks.getMemoryBlocksCountQuerySQL();
  const entitiesQuery = memory_entities.getMemoryEntitiesCountQuerySQL();
  const relationshipsQuery = entity_relationships.getEntityRelationshipsCountQuerySQL();
  const sessionsQuery = conversation_sessions.getConversationSessionsCountQuerySQL();
  const categoryTokensQuery = memory_entities.getMemoryEntityTokensByCategoryQuerySQL();
  const tierTokensQuery = memory_entities.getMemoryEntityTokensByTierQuerySQL();
  const blockTypeTokensQuery = memory_blocks.getMemoryBlockTokensByTypeQuerySQL();

  const memoryBlocksResult = useLiveQuery<memory_blocks.GetMemoryBlocksCountResult>(blocksQuery.sql, blocksQuery.params);
  const memoryEntitiesResult = useLiveQuery<memory_entities.GetMemoryEntitiesCountResult>(entitiesQuery.sql, entitiesQuery.params);
  const relationshipsResult = useLiveQuery<entity_relationships.GetEntityRelationshipsCountResult>(relationshipsQuery.sql, relationshipsQuery.params);
  const sessionsResult = useLiveQuery<conversation_sessions.GetConversationSessionsCountResult>(sessionsQuery.sql, sessionsQuery.params);
  const categoryTokensResult = useLiveQuery<memory_entities.GetMemoryEntityTokensByCategoryResult>(categoryTokensQuery.sql, categoryTokensQuery.params);
  const tierTokensResult = useLiveQuery<memory_entities.GetMemoryEntityTokensByTierResult>(tierTokensQuery.sql, tierTokensQuery.params);
  const blockTypeTokensResult = useLiveQuery<memory_blocks.GetMemoryBlockTokensByTypeResult>(blockTypeTokensQuery.sql, blockTypeTokensQuery.params);

  const blockCount = memoryBlocksResult?.rows?.[0]?.count ?? 0;
  const entityCount = memoryEntitiesResult?.rows?.[0]?.count ?? 0;
  const relationshipCount = relationshipsResult?.rows?.[0]?.count ?? 0;
  const sessionCount = sessionsResult?.rows?.[0]?.count ?? 0;

  const categoryTokensData = categoryTokensResult?.rows ?? [];
  const tierTokensData = tierTokensResult?.rows ?? [];
  const blockTypeTokensData = blockTypeTokensResult?.rows ?? [];

  const totalEntityTokens = categoryTokensData.reduce((sum, item) => sum + (Number(item.total_tokens) || 0), 0);
  const totalBlockTokens = blockTypeTokensData.reduce((sum, item) => sum + (Number(item.total_tokens) || 0), 0);
  const totalTokens = totalEntityTokens + totalBlockTokens;

  const categoryChartData = categoryTokensData
    .map((item, idx) => ({
      name: item.category.charAt(0).toUpperCase() + item.category.slice(1),
      value: Number(item.total_tokens) || 0,
      count: Number(item.count) || 0,
      color: ENTITY_COLORS[idx % ENTITY_COLORS.length],
    }))
    .filter(item => item.value > 0);

  const tierChartData = tierTokensData
    .map((item, idx) => ({
      name: item.memory_tier.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      value: Number(item.total_tokens) || 0,
      count: Number(item.count) || 0,
      color: TIER_COLORS[idx % TIER_COLORS.length],
    }))
    .filter(item => item.value > 0);

  return (
    <div className="flex flex-1 min-w-0 min-h-0">
      <div className="flex-1 flex flex-col gap-4 overflow-auto p-4 md:p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Brain className="h-3.5 w-3.5" />
                Memory Blocks
              </CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">{blockCount}</CardTitle>
            </CardHeader>
            <CardFooter className="text-sm text-muted-foreground">Core memories</CardFooter>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Database className="h-3.5 w-3.5" />
                Entities
              </CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">{entityCount}</CardTitle>
            </CardHeader>
            <CardFooter className="text-sm text-muted-foreground">Knowledge items</CardFooter>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Network className="h-3.5 w-3.5" />
                Relations
              </CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">{relationshipCount}</CardTitle>
            </CardHeader>
            <CardFooter className="text-sm text-muted-foreground">Connections</CardFooter>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Activity className="h-3.5 w-3.5" />
                Sessions
              </CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">{sessionCount}</CardTitle>
            </CardHeader>
            <CardFooter className="text-sm text-muted-foreground">Conversations</CardFooter>
          </Card>

          <Card className="col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Brain className="h-3.5 w-3.5" />
                Total Tokens
              </CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">
                {totalTokens.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardFooter className="text-sm text-muted-foreground">
              <Badge variant="outline">{totalTokens > 0 ? `${((totalTokens / 200000) * 100).toFixed(1)}%` : '0%'} of 200K</Badge>
            </CardFooter>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Tokens by Category</CardTitle>
              <CardDescription>Memory usage by entity type</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center min-h-[200px]">
              {categoryChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={categoryChartData} cx="50%" cy="50%" innerRadius="50%" outerRadius="70%" paddingAngle={3} dataKey="value">
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                        fontSize: '11px',
                      }}
                      formatter={(value: number, _name: string, props: any) => [
                        `${value.toLocaleString()} tokens (${props.payload.count} items)`,
                        props.payload.name,
                      ]}
                    />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-sm text-muted-foreground">No entities yet</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Tokens by Memory Tier</CardTitle>
              <CardDescription>Short-term vs long-term usage</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center min-h-[200px]">
              {tierChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={tierChartData} cx="50%" cy="50%" innerRadius="50%" outerRadius="70%" paddingAngle={3} dataKey="value">
                      {tierChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                        fontSize: '11px',
                      }}
                      formatter={(value: number, _name: string, props: any) => [
                        `${value.toLocaleString()} tokens (${props.payload.count} items)`,
                        props.payload.name,
                      ]}
                    />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-sm text-muted-foreground">No tier data</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Chat Panel */}
      <div className="hidden lg:flex w-80 min-h-0">
        <ChatPanel />
      </div>
    </div>
  )
}
