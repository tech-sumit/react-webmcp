import { eq, sql, count } from 'drizzle-orm';
import { db } from '../database';
import * as schema from '../schema';

export const getEntityRelationshipsCountQuery = () => {
  return db.select({ count: sql<number>`count(*)::int` }).from(schema.entity_relationships);
};
export const getEntityRelationshipsCountQuerySQL = () => getEntityRelationshipsCountQuery().toSQL();
export type GetEntityRelationshipsCountResult = Awaited<ReturnType<typeof getEntityRelationshipsCountQuery>>[number];

export const getAllEntityRelationshipsQuery = () => {
  return db.select().from(schema.entity_relationships);
};
export const getAllEntityRelationshipsQuerySQL = () => getAllEntityRelationshipsQuery().toSQL();
export type GetAllEntityRelationshipsResult = Awaited<ReturnType<typeof getAllEntityRelationshipsQuery>>[number];

export async function get_by_entity_id(entity_id: string) {
  const outgoing = await db.select({ relationship: schema.entity_relationships, target: schema.memory_entities })
    .from(schema.entity_relationships)
    .leftJoin(schema.memory_entities, eq(schema.entity_relationships.to_entity_id, schema.memory_entities.id))
    .where(eq(schema.entity_relationships.from_entity_id, entity_id));

  const incoming = await db.select({ relationship: schema.entity_relationships, source: schema.memory_entities })
    .from(schema.entity_relationships)
    .leftJoin(schema.memory_entities, eq(schema.entity_relationships.from_entity_id, schema.memory_entities.id))
    .where(eq(schema.entity_relationships.to_entity_id, entity_id));

  return { outgoing, incoming };
}

export async function create(data: schema.InsertEntityRelationship) {
  const validated = schema.insert_entity_relationship_schema.parse(data);
  const [relationship] = await db.insert(schema.entity_relationships).values(validated).returning();
  return relationship;
}

export async function remove(id: string) {
  await db.delete(schema.entity_relationships).where(eq(schema.entity_relationships.id, id));
}
