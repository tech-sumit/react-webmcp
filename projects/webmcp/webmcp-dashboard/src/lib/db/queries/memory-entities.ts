import { eq, desc, or, sql, count } from 'drizzle-orm';
import { db } from '../database';
import * as schema from '../schema';
import type { InsertMemoryEntity, UpdateMemoryEntity } from '../schema';

type MemoryEntityCategory = 'fact' | 'preference' | 'skill' | 'rule' | 'context' | 'person' | 'project' | 'goal';

export const getAllMemoryEntitiesQuery = () => {
  return db
    .select()
    .from(schema.memory_entities)
    .orderBy(desc(schema.memory_entities.importance_score), desc(schema.memory_entities.last_mentioned));
};

export const getAllMemoryEntitiesQuerySQL = () => getAllMemoryEntitiesQuery().toSQL();
export type GetAllMemoryEntitiesResult = Awaited<ReturnType<typeof getAllMemoryEntitiesQuery>>[number];

export const getMemoryEntitiesCountQuery = () => {
  return db.select({ count: sql<number>`count(*)::int` }).from(schema.memory_entities);
};
export const getMemoryEntitiesCountQuerySQL = () => getMemoryEntitiesCountQuery().toSQL();
export type GetMemoryEntitiesCountResult = Awaited<ReturnType<typeof getMemoryEntitiesCountQuery>>[number];

export const getMemoryEntityCategoryCountsQuery = () => {
  return db
    .select({ category: schema.memory_entities.category, count: count() })
    .from(schema.memory_entities)
    .groupBy(schema.memory_entities.category);
};
export const getMemoryEntityCategoryCountsQuerySQL = () => getMemoryEntityCategoryCountsQuery().toSQL();
export type GetMemoryEntityCategoryCountsResult = Awaited<ReturnType<typeof getMemoryEntityCategoryCountsQuery>>[number];

export const getMemoryEntityTokensByCategoryQuery = () => {
  return db
    .select({
      category: schema.memory_entities.category,
      total_tokens: sql<number>`COALESCE(SUM(${schema.memory_entities.token_cost}), 0)::int`.as('total_tokens'),
      count: count(),
    })
    .from(schema.memory_entities)
    .groupBy(schema.memory_entities.category);
};
export const getMemoryEntityTokensByCategoryQuerySQL = () => getMemoryEntityTokensByCategoryQuery().toSQL();
export type GetMemoryEntityTokensByCategoryResult = Awaited<ReturnType<typeof getMemoryEntityTokensByCategoryQuery>>[number];

export const getMemoryEntityTokensByTierQuery = () => {
  return db
    .select({
      memory_tier: schema.memory_entities.memory_tier,
      total_tokens: sql<number>`COALESCE(SUM(${schema.memory_entities.token_cost}), 0)::int`.as('total_tokens'),
      count: count(),
    })
    .from(schema.memory_entities)
    .groupBy(schema.memory_entities.memory_tier);
};
export const getMemoryEntityTokensByTierQuerySQL = () => getMemoryEntityTokensByTierQuery().toSQL();
export type GetMemoryEntityTokensByTierResult = Awaited<ReturnType<typeof getMemoryEntityTokensByTierQuery>>[number];

export async function get_all(options?: { category?: MemoryEntityCategory; limit?: number }) {
  const { category, limit = 100 } = options ?? {};
  if (category) {
    return db.select().from(schema.memory_entities)
      .where(eq(schema.memory_entities.category, category))
      .orderBy(desc(schema.memory_entities.importance_score))
      .limit(limit);
  }
  return db.select().from(schema.memory_entities)
    .orderBy(desc(schema.memory_entities.importance_score))
    .limit(limit);
}

export async function get_by_id(id: string) {
  const [entity] = await db.select().from(schema.memory_entities).where(eq(schema.memory_entities.id, id));
  return entity ?? null;
}

export async function create(data: InsertMemoryEntity) {
  const validated = schema.insert_memory_entity_schema.parse(data);
  const [entity] = await db.insert(schema.memory_entities).values(validated).returning();
  return entity;
}

export async function update(data: UpdateMemoryEntity) {
  const validated = schema.update_memory_entity_schema.parse(data);
  const { id, ...updates } = validated;
  const [entity] = await db.update(schema.memory_entities).set({ ...updates, updated_at: new Date() }).where(eq(schema.memory_entities.id, id as string)).returning();
  return entity ?? null;
}

export async function remove(id: string) {
  await db.delete(schema.memory_entities).where(eq(schema.memory_entities.id, id));
}

export async function search(query: string, options?: { category?: MemoryEntityCategory }) {
  const { category } = options ?? {};
  const search_pattern = `%${query}%`;
  const conditions = or(
    sql`${schema.memory_entities.name} ILIKE ${search_pattern}`,
    sql`${schema.memory_entities.description} ILIKE ${search_pattern}`
  );
  if (category) {
    return db.select().from(schema.memory_entities)
      .where(sql`${conditions} AND ${eq(schema.memory_entities.category, category)}`)
      .orderBy(desc(schema.memory_entities.importance_score));
  }
  return db.select().from(schema.memory_entities).where(conditions!).orderBy(desc(schema.memory_entities.importance_score));
}

export async function get_by_tag(tag: string) {
  return db.select().from(schema.memory_entities)
    .where(sql`${tag} = ANY(${schema.memory_entities.tags})`)
    .orderBy(desc(schema.memory_entities.importance_score));
}
