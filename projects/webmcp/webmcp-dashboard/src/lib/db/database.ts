import { PGlite } from '@electric-sql/pglite';
import { live } from '@electric-sql/pglite/live';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from './schema';
import { runMigrations } from './migrate';

if (!window.pg_lite) {
  window.pg_lite = await PGlite.create({
    dataDir: 'idb://webmcp-dashboard-db',
    relaxedDurability: true,
    extensions: { live },
  });
}

if (!window.db) {
  window.db = drizzle(window.pg_lite, { schema });
}

export const db = window.db;
export const pg_lite = window.pg_lite;

export const db_utils = {
  async clear_all() {
    await window.db.delete(schema.entity_mentions);
    await window.db.delete(schema.entity_relationships);
    await window.db.delete(schema.conversation_messages);
    await window.db.delete(schema.conversation_sessions);
    await window.db.delete(schema.memory_entities);
    await window.db.delete(schema.memory_blocks);
    await window.db.delete(schema.memory_retrieval_logs);
  },

  async reset() {
    await window.pg_lite.exec(`
      DROP TABLE IF EXISTS entity_mentions CASCADE;
      DROP TABLE IF EXISTS entity_contexts CASCADE;
      DROP TABLE IF EXISTS entity_relationships CASCADE;
      DROP TABLE IF EXISTS conversation_messages CASCADE;
      DROP TABLE IF EXISTS conversation_sessions CASCADE;
      DROP TABLE IF EXISTS memory_entities CASCADE;
      DROP TABLE IF EXISTS memory_blocks CASCADE;
      DROP TABLE IF EXISTS memory_retrieval_logs CASCADE;
      DROP TABLE IF EXISTS memory_contexts CASCADE;
      DROP TABLE IF EXISTS sql_execution_log CASCADE;
    `);
  },

  async get_stats() {
    const [blocks, entities, rels, sessions, messages] = await Promise.all([
      window.db.select().from(schema.memory_blocks).then(r => r.length),
      window.db.select().from(schema.memory_entities).then(r => r.length),
      window.db.select().from(schema.entity_relationships).then(r => r.length),
      window.db.select().from(schema.conversation_sessions).then(r => r.length),
      window.db.select().from(schema.conversation_messages).then(r => r.length),
    ]);
    return { memory_blocks: blocks, memory_entities: entities, entity_relationships: rels, conversation_sessions: sessions, conversation_messages: messages, total: blocks + entities + rels + sessions + messages };
  },
};

let dbReadyPromise: Promise<void> | null = null;

if (!window.__db_initialized) {
  window.__db_initialized = true;
  dbReadyPromise = (async () => {
    await window.pg_lite.waitReady;
    await runMigrations();
  })();
} else {
  dbReadyPromise = Promise.resolve();
}

export const waitForDb = () => dbReadyPromise!;

declare global {
  interface Window {
    db: ReturnType<typeof drizzle<typeof schema>>;
    pg_lite: PGlite;
    __db_initialized?: boolean;
  }
}
