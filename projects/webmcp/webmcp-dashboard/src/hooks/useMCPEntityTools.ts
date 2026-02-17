import { z } from 'zod';
import { useModelContext } from '@/lib/webmcp';
import { toast } from 'sonner';
import { memory_entities } from '@/lib/db';
import type { InsertMemoryEntity } from '@/lib/db/schema';

export function useMCPEntityTools() {
  useModelContext({
    name: 'create_entity',
    description: 'Create a new memory entity (structured knowledge).\n\nCategories: fact, preference, skill, rule, context, person, project, goal',
    inputSchema: {
      category: z.enum(['fact', 'preference', 'skill', 'rule', 'context', 'person', 'project', 'goal']).describe('Entity category'),
      name: z.string().min(1).max(200).describe('Entity name'),
      description: z.string().min(1).describe('Detailed description'),
      tags: z.array(z.string()).optional().describe('Tags for categorization'),
      confidence: z.number().min(0).max(100).optional().describe('Confidence score 0-100'),
      importance_score: z.number().min(0).max(100).optional().describe('Importance 0-100'),
    },
    annotations: { title: 'Create Entity', readOnlyHint: false },
    handler: async (input) => {
      const entity = await memory_entities.create(input as unknown as InsertMemoryEntity);
      toast.success(`Created entity: ${entity.name}`);
      return entity;
    },
  });

  useModelContext({
    name: 'search_entities',
    description: 'Search memory entities by name or description',
    inputSchema: {
      query: z.string().min(1).describe('Search query'),
      category: z.enum(['fact', 'preference', 'skill', 'rule', 'context', 'person', 'project', 'goal']).optional().describe('Filter by category'),
    },
    annotations: { title: 'Search Entities', readOnlyHint: true },
    handler: async (input) => {
      const results = await memory_entities.search(
        input.query as string,
        { category: input.category as any }
      );
      return { count: results.length, entities: results };
    },
  });

  useModelContext({
    name: 'list_entities',
    description: 'List all memory entities, optionally filtered by category',
    inputSchema: {
      category: z.enum(['fact', 'preference', 'skill', 'rule', 'context', 'person', 'project', 'goal']).optional().describe('Filter by category'),
      limit: z.number().optional().describe('Maximum number of results'),
    },
    annotations: { title: 'List Entities', readOnlyHint: true },
    handler: async (input) => {
      const results = await memory_entities.get_all({
        category: input.category as any,
        limit: input.limit as number,
      });
      return { count: results.length, entities: results };
    },
  });

  useModelContext({
    name: 'get_entity',
    description: 'Get a single memory entity by ID',
    inputSchema: {
      id: z.string().uuid().describe('Entity UUID'),
    },
    annotations: { title: 'Get Entity', readOnlyHint: true },
    handler: async (input) => {
      const entity = await memory_entities.get_by_id(input.id as string);
      if (!entity) return { error: 'Entity not found' };
      return entity;
    },
  });

  useModelContext({
    name: 'delete_entity',
    description: 'Delete a memory entity by ID',
    inputSchema: {
      id: z.string().uuid().describe('Entity UUID to delete'),
    },
    annotations: { title: 'Delete Entity', readOnlyHint: false },
    handler: async (input) => {
      await memory_entities.remove(input.id as string);
      toast.success('Entity deleted');
      return { success: true };
    },
  });
}
