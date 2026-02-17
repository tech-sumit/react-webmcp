import { pgTable, uuid, text, timestamp, integer, index, jsonb, boolean, primaryKey, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { relations, sql, type SQL } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// MEMORY BLOCKS - Always-in-context information
export const memory_blocks = pgTable('memory_blocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  block_type: text('block_type', {
    enum: ['user_profile', 'agent_persona', 'current_goals', 'context']
  }).notNull(),
  label: text('label').notNull(),
  value: text('value').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  char_limit: integer('char_limit').notNull().default(500),
  priority: integer('priority').notNull().default(0),
  token_cost: integer('token_cost').notNull().generatedAlwaysAs(
    (): SQL => sql`CEIL(LENGTH(${memory_blocks.value})::NUMERIC / 4)`
  ),
  inclusion_priority: integer('inclusion_priority').notNull().default(50),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
  last_accessed: timestamp('last_accessed'),
}, (table) => [
  index('memory_blocks_type_idx').on(table.block_type),
  index('memory_blocks_priority_idx').on(table.priority),
]);

// MEMORY ENTITIES - Structured knowledge
export const memory_entities = pgTable('memory_entities', {
  id: uuid('id').primaryKey().defaultRandom(),
  category: text('category', {
    enum: ['fact', 'preference', 'skill', 'rule', 'context', 'person', 'project', 'goal']
  }).notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  tags: text('tags').array().notNull().default([]),
  confidence: integer('confidence').notNull().default(100),
  source_type: text('source_type'),
  source_session_id: uuid('source_session_id'),
  source_message_id: uuid('source_message_id'),
  mention_count: integer('mention_count').notNull().default(1),
  last_mentioned: timestamp('last_mentioned').notNull().defaultNow(),
  importance_score: integer('importance_score').notNull().default(50),
  memory_tier: text('memory_tier', {
    enum: ['short_term', 'working', 'long_term', 'archived']
  }).notNull().default('short_term'),
  access_count: integer('access_count').notNull().default(0),
  last_accessed: timestamp('last_accessed'),
  promotion_score: integer('promotion_score').notNull().default(0),
  decay_rate: integer('decay_rate').notNull().default(10),
  last_reinforced: timestamp('last_reinforced').notNull().defaultNow(),
  current_strength: integer('current_strength').notNull().default(100),
  memory_type: text('memory_type', {
    enum: ['episodic', 'semantic']
  }).notNull().default('semantic'),
  token_cost: integer('token_cost').notNull().generatedAlwaysAs(
    (): SQL => sql`CEIL(LENGTH(${memory_entities.name} || ' ' || ${memory_entities.description})::NUMERIC / 4)`
  ),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('memory_entities_category_idx').on(table.category),
  index('memory_entities_importance_idx').on(table.importance_score),
  index('memory_entities_name_idx').on(table.name),
  index('memory_entities_tier_idx').on(table.memory_tier),
]);

// ENTITY RELATIONSHIPS - Knowledge graph
export const entity_relationships = pgTable('entity_relationships', {
  id: uuid('id').primaryKey().defaultRandom(),
  from_entity_id: uuid('from_entity_id').notNull().references(() => memory_entities.id, { onDelete: 'cascade' }),
  to_entity_id: uuid('to_entity_id').notNull().references(() => memory_entities.id, { onDelete: 'cascade' }),
  relationship_type: text('relationship_type').notNull(),
  description: text('description'),
  strength: integer('strength').notNull().default(1),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('entity_rel_from_idx').on(table.from_entity_id),
  index('entity_rel_to_idx').on(table.to_entity_id),
]);

// CONVERSATION SESSIONS
export const conversation_sessions = pgTable('conversation_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title'),
  summary: text('summary'),
  message_count: integer('message_count').notNull().default(0),
  entity_count: integer('entity_count').notNull().default(0),
  started_at: timestamp('started_at').notNull().defaultNow(),
  last_activity: timestamp('last_activity').notNull().defaultNow(),
  ended_at: timestamp('ended_at'),
}, (table) => [
  index('conv_sessions_started_idx').on(table.started_at),
]);

// CONVERSATION MESSAGES
export const conversation_messages = pgTable('conversation_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  session_id: uuid('session_id').notNull().references(() => conversation_sessions.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  token_count: integer('token_count'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('conv_messages_session_idx').on(table.session_id),
]);

// ENTITY MENTIONS
export const entity_mentions = pgTable('entity_mentions', {
  id: uuid('id').primaryKey().defaultRandom(),
  entity_id: uuid('entity_id').notNull().references(() => memory_entities.id, { onDelete: 'cascade' }),
  message_id: uuid('message_id').notNull().references(() => conversation_messages.id, { onDelete: 'cascade' }),
  session_id: uuid('session_id').notNull().references(() => conversation_sessions.id, { onDelete: 'cascade' }),
  mention_context: text('mention_context'),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('entity_mentions_entity_idx').on(table.entity_id),
]);

// MEMORY RETRIEVAL LOGS
export const memory_retrieval_logs = pgTable('memory_retrieval_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  session_id: uuid('session_id').references(() => conversation_sessions.id, { onDelete: 'set null' }),
  query_text: text('query_text'),
  query_type: text('query_type'),
  retrieved_entity_ids: jsonb('retrieved_entity_ids'),
  retrieval_scores: jsonb('retrieval_scores'),
  retrieval_time_ms: integer('retrieval_time_ms'),
  result_count: integer('result_count').notNull().default(0),
  created_at: timestamp('created_at').notNull().defaultNow(),
});

// MEMORY CONTEXTS
export const memory_contexts = pgTable('memory_contexts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  description: text('description'),
  parent_context_id: uuid('parent_context_id').references((): AnyPgColumn => memory_contexts.id),
  active: boolean('active').notNull().default(true),
  color: text('color'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('contexts_name_idx').on(table.name),
]);

// ENTITY CONTEXTS - junction table
export const entity_contexts = pgTable('entity_contexts', {
  entity_id: uuid('entity_id').notNull().references(() => memory_entities.id, { onDelete: 'cascade' }),
  context_id: uuid('context_id').notNull().references(() => memory_contexts.id, { onDelete: 'cascade' }),
  relevance_score: integer('relevance_score').notNull().default(50),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.entity_id, table.context_id] }),
]);

// SQL EXECUTION LOG
export const sql_execution_log = pgTable('sql_execution_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  query: text('query').notNull(),
  source: text('source', { enum: ['ai', 'manual'] }).notNull(),
  success: boolean('success').notNull(),
  rows_affected: integer('rows_affected'),
  result_data: jsonb('result_data').$type<{ rows: unknown[]; fields?: { name: string }[] }>(),
  error_message: text('error_message'),
  execution_time_ms: integer('execution_time_ms'),
  executed_at: timestamp('executed_at').notNull().defaultNow(),
}, (table) => [
  index('sql_log_source_idx').on(table.source),
]);

// RELATIONS
export const memoryBlocksRelations = relations(memory_blocks, () => ({}));

export const memoryEntitiesRelations = relations(memory_entities, ({ many }) => ({
  outgoing_relationships: many(entity_relationships, { relationName: 'from_entity' }),
  incoming_relationships: many(entity_relationships, { relationName: 'to_entity' }),
  mentions: many(entity_mentions),
  contexts: many(entity_contexts),
}));

export const entityRelationshipsRelations = relations(entity_relationships, ({ one }) => ({
  from_entity: one(memory_entities, {
    fields: [entity_relationships.from_entity_id],
    references: [memory_entities.id],
    relationName: 'from_entity',
  }),
  to_entity: one(memory_entities, {
    fields: [entity_relationships.to_entity_id],
    references: [memory_entities.id],
    relationName: 'to_entity',
  }),
}));

export const conversationSessionsRelations = relations(conversation_sessions, ({ many }) => ({
  messages: many(conversation_messages),
  entity_mentions: many(entity_mentions),
}));

export const conversationMessagesRelations = relations(conversation_messages, ({ one, many }) => ({
  session: one(conversation_sessions, {
    fields: [conversation_messages.session_id],
    references: [conversation_sessions.id],
  }),
  entity_mentions: many(entity_mentions),
}));

export const entityMentionsRelations = relations(entity_mentions, ({ one }) => ({
  entity: one(memory_entities, {
    fields: [entity_mentions.entity_id],
    references: [memory_entities.id],
  }),
  message: one(conversation_messages, {
    fields: [entity_mentions.message_id],
    references: [conversation_messages.id],
  }),
  session: one(conversation_sessions, {
    fields: [entity_mentions.session_id],
    references: [conversation_sessions.id],
  }),
}));

export const memoryContextsRelations = relations(memory_contexts, ({ many, one }) => ({
  entities: many(entity_contexts),
  parent: one(memory_contexts, {
    fields: [memory_contexts.parent_context_id],
    references: [memory_contexts.id],
    relationName: 'parent_context',
  }),
  children: many(memory_contexts, { relationName: 'parent_context' }),
}));

export const entityContextsRelations = relations(entity_contexts, ({ one }) => ({
  entity: one(memory_entities, {
    fields: [entity_contexts.entity_id],
    references: [memory_entities.id],
  }),
  context: one(memory_contexts, {
    fields: [entity_contexts.context_id],
    references: [memory_contexts.id],
  }),
}));

// TYPE EXPORTS
export type MemoryBlock = typeof memory_blocks.$inferSelect;
export type MemoryEntity = typeof memory_entities.$inferSelect;
export type EntityRelationship = typeof entity_relationships.$inferSelect;
export type ConversationSession = typeof conversation_sessions.$inferSelect;
export type ConversationMessage = typeof conversation_messages.$inferSelect;
export type EntityMention = typeof entity_mentions.$inferSelect;
export type MemoryContext = typeof memory_contexts.$inferSelect;
export type EntityContext = typeof entity_contexts.$inferSelect;
export type SQLExecutionLog = typeof sql_execution_log.$inferSelect;

// ZOD SCHEMAS
export const select_memory_block_schema = createSelectSchema(memory_blocks);
export const insert_memory_block_schema = createInsertSchema(memory_blocks, {
  block_type: (schema) => schema.default('context'),
  label: (schema) => schema.min(1).max(200),
  value: (schema) => schema.min(1),
  char_limit: (schema) => schema.positive(),
}).omit({
  id: true,
  created_at: true,
  updated_at: true,
  last_accessed: true,
  inclusion_priority: true,
});

export const update_memory_block_schema = insert_memory_block_schema.partial().extend({
  id: z.string().uuid(),
});

export const select_memory_entity_schema = createSelectSchema(memory_entities);
export const insert_memory_entity_schema = createInsertSchema(memory_entities, {
  name: (schema) => schema.min(1).max(200),
  description: (schema) => schema.min(1),
  confidence: (schema) => schema.min(0).max(100),
  importance_score: (schema) => schema.min(0).max(100),
}).omit({
  id: true,
  mention_count: true,
  last_mentioned: true,
  created_at: true,
  updated_at: true,
});

export const update_memory_entity_schema = insert_memory_entity_schema.partial().extend({
  id: z.string().uuid(),
});

export const select_entity_relationship_schema = createSelectSchema(entity_relationships);
export const insert_entity_relationship_schema = createInsertSchema(entity_relationships, {
  relationship_type: (schema) => schema.min(1).max(100),
  strength: (schema) => schema.min(1).max(10),
}).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const update_entity_relationship_schema = insert_entity_relationship_schema.partial().extend({
  id: z.string().uuid(),
});

export const insert_sql_execution_log_schema = createInsertSchema(sql_execution_log, {
  query: (schema) => schema.min(1),
}).omit({
  id: true,
  executed_at: true,
});

// INSERT/UPDATE types
export type InsertMemoryBlock = typeof memory_blocks.$inferInsert;
export type UpdateMemoryBlock = Partial<InsertMemoryBlock> & { id: string };
export type InsertMemoryEntity = typeof memory_entities.$inferInsert;
export type UpdateMemoryEntity = Partial<InsertMemoryEntity> & { id: string };
export type InsertEntityRelationship = typeof entity_relationships.$inferInsert;
export type UpdateEntityRelationship = Partial<InsertEntityRelationship> & { id: string };
export type InsertConversationSession = typeof conversation_sessions.$inferInsert;
export type InsertConversationMessage = typeof conversation_messages.$inferInsert;
export type InsertEntityMention = typeof entity_mentions.$inferInsert;
export type InsertSQLExecutionLog = typeof sql_execution_log.$inferInsert;
