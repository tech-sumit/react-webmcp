import { z } from 'zod';
import { useModelContext } from '@/lib/webmcp';
import { pg_lite, db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { toast } from 'sonner';

export function useMCPSQLTool() {
  useModelContext({
    name: 'sql_query',
    description: 'Execute a SQL query against the PGlite database. SELECT queries return results. INSERT/UPDATE/DELETE queries return affected rows.',
    inputSchema: {
      query: z.string().min(1).describe('SQL query to execute'),
    },
    handler: async (input) => {
      const query = input.query as string;
      const startTime = performance.now();
      try {
        const result = await pg_lite.query(query);
        const executionTime = Math.round(performance.now() - startTime);

        // Log to sql_execution_log
        try {
          await db.insert(schema.sql_execution_log).values({
            query,
            source: 'ai',
            success: true,
            rows_affected: result.rows.length,
            result_data: { rows: result.rows.slice(0, 50), fields: result.fields?.map(f => ({ name: f.name })) },
            execution_time_ms: executionTime,
          });
        } catch { /* logging failure shouldn't break the tool */ }

        toast.success(`Query executed (${executionTime}ms)`);
        return {
          success: true,
          rows: result.rows.slice(0, 100),
          rowCount: result.rows.length,
          fields: result.fields?.map(f => f.name),
          executionTimeMs: executionTime,
        };
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        const executionTime = Math.round(performance.now() - startTime);

        try {
          await db.insert(schema.sql_execution_log).values({
            query,
            source: 'ai',
            success: false,
            error_message: error,
            execution_time_ms: executionTime,
          });
        } catch { /* logging failure shouldn't break the tool */ }

        toast.error(`Query failed: ${error}`);
        return { success: false, error };
      }
    },
  });

  useModelContext({
    name: 'list_tables',
    description: 'List all tables in the database with their schemas',
    inputSchema: {},
    annotations: { readOnlyHint: true },
    handler: async () => {
      const result = await pg_lite.query(`
        SELECT table_name, column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      `);
      return { tables: result.rows };
    },
  });
}
