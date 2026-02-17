import { sql } from 'drizzle-orm';
import { db } from '../database';
import * as schema from '../schema';

export const getConversationSessionsCountQuery = () => {
  return db.select({ count: sql<number>`count(*)::int` }).from(schema.conversation_sessions);
};
export const getConversationSessionsCountQuerySQL = () => getConversationSessionsCountQuery().toSQL();
export type GetConversationSessionsCountResult = Awaited<ReturnType<typeof getConversationSessionsCountQuery>>[number];
