import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../database';
import * as schema from '../schema';

export const getAllMemoryBlocksQuery = () => {
  return db.select().from(schema.memory_blocks)
    .orderBy(desc(schema.memory_blocks.priority), desc(schema.memory_blocks.updated_at));
};

export const getAllMemoryBlocksQuerySQL = () => getAllMemoryBlocksQuery().toSQL();
export type GetAllMemoryBlocksResult = Awaited<ReturnType<typeof getAllMemoryBlocksQuery>>[number];

export const getMemoryBlocksCountQuery = () => {
  return db.select({ count: sql<number>`count(*)::int` }).from(schema.memory_blocks);
};
export const getMemoryBlocksCountQuerySQL = () => getMemoryBlocksCountQuery().toSQL();
export type GetMemoryBlocksCountResult = Awaited<ReturnType<typeof getMemoryBlocksCountQuery>>[number];

export const getMemoryBlockTokensByTypeQuery = () => {
  return db
    .select({
      block_type: schema.memory_blocks.block_type,
      total_tokens: sql<number>`COALESCE(SUM(${schema.memory_blocks.token_cost}), 0)::int`.as('total_tokens'),
      count: sql<number>`count(*)::int`.as('count'),
    })
    .from(schema.memory_blocks)
    .groupBy(schema.memory_blocks.block_type);
};
export const getMemoryBlockTokensByTypeQuerySQL = () => getMemoryBlockTokensByTypeQuery().toSQL();
export type GetMemoryBlockTokensByTypeResult = Awaited<ReturnType<typeof getMemoryBlockTokensByTypeQuery>>[number];

export async function get_all() {
  return db.select().from(schema.memory_blocks)
    .orderBy(desc(schema.memory_blocks.priority), desc(schema.memory_blocks.updated_at));
}

export async function get_by_id(id: string) {
  const [block] = await db.select().from(schema.memory_blocks).where(eq(schema.memory_blocks.id, id));
  return block ?? null;
}

export async function create(data: schema.InsertMemoryBlock) {
  const validated = schema.insert_memory_block_schema.parse(data);
  const [block] = await db.insert(schema.memory_blocks).values(validated).returning();
  return block;
}

export async function update(data: schema.UpdateMemoryBlock) {
  const validated = schema.update_memory_block_schema.parse(data);
  const { id, ...updates } = validated;
  const [block] = await db.update(schema.memory_blocks)
    .set({ ...updates, updated_at: new Date() })
    .where(eq(schema.memory_blocks.id, id as string))
    .returning();
  return block ?? null;
}

export async function remove(id: string) {
  await db.delete(schema.memory_blocks).where(eq(schema.memory_blocks.id, id));
}
