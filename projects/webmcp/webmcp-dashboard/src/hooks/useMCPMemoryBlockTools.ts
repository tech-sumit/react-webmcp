import { z } from 'zod';
import { useModelContext } from '@/lib/webmcp';
import { toast } from 'sonner';
import { memory_blocks } from '@/lib/db';
import type { InsertMemoryBlock } from '@/lib/db/schema';

export function useMCPMemoryBlockTools() {
  useModelContext({
    name: 'create_memory_block',
    description: 'Create a new memory block (always-in-context memory)',
    inputSchema: {
      block_type: z.enum(['user_profile', 'agent_persona', 'current_goals', 'context']).describe('Block type'),
      label: z.string().min(1).max(200).describe('Human-readable label'),
      value: z.string().min(1).describe('The memory content'),
      priority: z.number().optional().describe('Priority (higher = more important)'),
      char_limit: z.number().optional().describe('Character limit'),
    },
    handler: async (input) => {
      const block = await memory_blocks.create(input as unknown as InsertMemoryBlock);
      toast.success(`Created block: ${block.label}`);
      return block;
    },
  });

  useModelContext({
    name: 'list_memory_blocks',
    description: 'List all memory blocks',
    inputSchema: {},
    annotations: { readOnlyHint: true },
    handler: async () => {
      const blocks = await memory_blocks.get_all();
      return { count: blocks.length, blocks };
    },
  });

  useModelContext({
    name: 'delete_memory_block',
    description: 'Delete a memory block by ID',
    inputSchema: {
      id: z.string().uuid().describe('Block UUID'),
    },
    handler: async (input) => {
      await memory_blocks.remove(input.id as string);
      toast.success('Memory block deleted');
      return { success: true };
    },
  });
}
