/**
 * Run database migrations - creates all tables if they don't exist.
 * Uses raw SQL since Drizzle doesn't support DDL push in the browser.
 */
export async function runMigrations() {
  await window.pg_lite.exec(`
    -- MEMORY BLOCKS
    CREATE TABLE IF NOT EXISTS memory_blocks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      block_type TEXT NOT NULL,
      label TEXT NOT NULL,
      value TEXT NOT NULL,
      metadata JSONB,
      char_limit INTEGER NOT NULL DEFAULT 500,
      priority INTEGER NOT NULL DEFAULT 0,
      token_cost INTEGER NOT NULL GENERATED ALWAYS AS (CEIL(LENGTH(value)::NUMERIC / 4)) STORED,
      inclusion_priority INTEGER NOT NULL DEFAULT 50,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      last_accessed TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS memory_blocks_type_idx ON memory_blocks(block_type);
    CREATE INDEX IF NOT EXISTS memory_blocks_priority_idx ON memory_blocks(priority);

    -- MEMORY ENTITIES
    CREATE TABLE IF NOT EXISTS memory_entities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      tags TEXT[] NOT NULL DEFAULT '{}',
      confidence INTEGER NOT NULL DEFAULT 100,
      source_type TEXT,
      source_session_id UUID,
      source_message_id UUID,
      mention_count INTEGER NOT NULL DEFAULT 1,
      last_mentioned TIMESTAMP NOT NULL DEFAULT NOW(),
      importance_score INTEGER NOT NULL DEFAULT 50,
      memory_tier TEXT NOT NULL DEFAULT 'short_term',
      access_count INTEGER NOT NULL DEFAULT 0,
      last_accessed TIMESTAMP,
      promotion_score INTEGER NOT NULL DEFAULT 0,
      decay_rate INTEGER NOT NULL DEFAULT 10,
      last_reinforced TIMESTAMP NOT NULL DEFAULT NOW(),
      current_strength INTEGER NOT NULL DEFAULT 100,
      memory_type TEXT NOT NULL DEFAULT 'semantic',
      token_cost INTEGER NOT NULL GENERATED ALWAYS AS (CEIL(LENGTH(name || ' ' || description)::NUMERIC / 4)) STORED,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS memory_entities_category_idx ON memory_entities(category);
    CREATE INDEX IF NOT EXISTS memory_entities_importance_idx ON memory_entities(importance_score);
    CREATE INDEX IF NOT EXISTS memory_entities_name_idx ON memory_entities(name);
    CREATE INDEX IF NOT EXISTS memory_entities_tier_idx ON memory_entities(memory_tier);

    -- ENTITY RELATIONSHIPS
    CREATE TABLE IF NOT EXISTS entity_relationships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      from_entity_id UUID NOT NULL REFERENCES memory_entities(id) ON DELETE CASCADE,
      to_entity_id UUID NOT NULL REFERENCES memory_entities(id) ON DELETE CASCADE,
      relationship_type TEXT NOT NULL,
      description TEXT,
      strength INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS entity_rel_from_idx ON entity_relationships(from_entity_id);
    CREATE INDEX IF NOT EXISTS entity_rel_to_idx ON entity_relationships(to_entity_id);

    -- CONVERSATION SESSIONS
    CREATE TABLE IF NOT EXISTS conversation_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT,
      summary TEXT,
      message_count INTEGER NOT NULL DEFAULT 0,
      entity_count INTEGER NOT NULL DEFAULT 0,
      started_at TIMESTAMP NOT NULL DEFAULT NOW(),
      last_activity TIMESTAMP NOT NULL DEFAULT NOW(),
      ended_at TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS conv_sessions_started_idx ON conversation_sessions(started_at);

    -- CONVERSATION MESSAGES
    CREATE TABLE IF NOT EXISTS conversation_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      token_count INTEGER,
      metadata JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS conv_messages_session_idx ON conversation_messages(session_id);

    -- ENTITY MENTIONS
    CREATE TABLE IF NOT EXISTS entity_mentions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_id UUID NOT NULL REFERENCES memory_entities(id) ON DELETE CASCADE,
      message_id UUID NOT NULL REFERENCES conversation_messages(id) ON DELETE CASCADE,
      session_id UUID NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
      mention_context TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS entity_mentions_entity_idx ON entity_mentions(entity_id);

    -- MEMORY RETRIEVAL LOGS
    CREATE TABLE IF NOT EXISTS memory_retrieval_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID REFERENCES conversation_sessions(id) ON DELETE SET NULL,
      query_text TEXT,
      query_type TEXT,
      retrieved_entity_ids JSONB,
      retrieval_scores JSONB,
      retrieval_time_ms INTEGER,
      result_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- MEMORY CONTEXTS
    CREATE TABLE IF NOT EXISTS memory_contexts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      parent_context_id UUID REFERENCES memory_contexts(id),
      active BOOLEAN NOT NULL DEFAULT TRUE,
      color TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS contexts_name_idx ON memory_contexts(name);

    -- ENTITY CONTEXTS (junction table)
    CREATE TABLE IF NOT EXISTS entity_contexts (
      entity_id UUID NOT NULL REFERENCES memory_entities(id) ON DELETE CASCADE,
      context_id UUID NOT NULL REFERENCES memory_contexts(id) ON DELETE CASCADE,
      relevance_score INTEGER NOT NULL DEFAULT 50,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (entity_id, context_id)
    );

    -- SQL EXECUTION LOG
    CREATE TABLE IF NOT EXISTS sql_execution_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      query TEXT NOT NULL,
      source TEXT NOT NULL,
      success BOOLEAN NOT NULL,
      rows_affected INTEGER,
      result_data JSONB,
      error_message TEXT,
      execution_time_ms INTEGER,
      executed_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS sql_log_source_idx ON sql_execution_log(source);
  `);
}
