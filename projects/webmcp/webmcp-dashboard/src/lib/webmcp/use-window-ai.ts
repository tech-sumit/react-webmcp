import { useState, useCallback, useRef, useEffect } from "react";
import type {
  ChatMessage,
  ToolCall,
  AILanguageModel,
  AILanguageModelCapabilities,
} from "./types";
import { getRegisteredTools, executeTool } from "./use-model-context";

/**
 * useWindowAI - Hook for interacting with the window.ai Prompt API
 *
 * Provides a chat interface powered by Chrome's built-in AI (Prompt API).
 * Automatically integrates with tools registered via useModelContext.
 *
 * If window.ai is not available, provides a fallback "tool-only" mode
 * where the user can still call tools directly.
 */
export function useWindowAI() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [capabilities, setCapabilities] = useState<AILanguageModelCapabilities | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const sessionRef = useRef<AILanguageModel | null>(null);
  const messagesRef = useRef<ChatMessage[]>(messages);

  // Keep ref in sync so async callbacks always see the latest messages
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Check if window.ai is available
  useEffect(() => {
    async function checkAvailability() {
      if (!window.ai?.languageModel) {
        setIsAvailable(false);
        return;
      }
      try {
        const caps = await window.ai.languageModel.capabilities();
        setCapabilities(caps);
        setIsAvailable(caps.available !== "no");
      } catch {
        setIsAvailable(false);
      }
    }
    checkAvailability();
  }, []);

  // Build system prompt with available tools
  const buildSystemPrompt = useCallback(() => {
    const tools = getRegisteredTools();

    let prompt = `You are a helpful AI assistant integrated into a WebMCP Dashboard application.
You help users manage their memory blocks, entities, and knowledge graph.

You have access to the following tools that you can invoke:

`;
    for (const tool of tools) {
      prompt += `## ${tool.name}\n`;
      prompt += `${tool.description}\n`;
      prompt += `Input schema: ${JSON.stringify(tool.inputSchema, null, 2)}\n\n`;
    }

    prompt += `
When the user asks you to perform an action, respond with a JSON tool call in this format:
\`\`\`tool
{"name": "tool_name", "arguments": {...}}
\`\`\`

You can make multiple tool calls in one response. After each tool call result,
continue your response to the user naturally.

If no tool is needed, just respond conversationally.`;

    return prompt;
  }, []);

  // Create or get an AI session
  const getSession = useCallback(async () => {
    if (sessionRef.current) return sessionRef.current;
    if (!window.ai?.languageModel) return null;

    try {
      const session = await window.ai.languageModel.create({
        systemPrompt: buildSystemPrompt(),
      });
      sessionRef.current = session;
      return session;
    } catch (e) {
      console.error("[window.ai] Failed to create session:", e);
      return null;
    }
  }, [buildSystemPrompt]);

  // Parse tool calls from AI response
  const parseToolCalls = (text: string): { cleanText: string; toolCalls: ToolCall[] } => {
    const toolCalls: ToolCall[] = [];
    const toolCallRegex = /```tool\s*\n?([\s\S]*?)```/g;
    let cleanText = text;
    let match;

    while ((match = toolCallRegex.exec(text)) !== null) {
      try {
        const parsed = JSON.parse(match[1].trim());
        toolCalls.push({
          name: parsed.name,
          arguments: parsed.arguments || {},
        });
        cleanText = cleanText.replace(match[0], "").trim();
      } catch {
        // Not valid JSON, leave as-is
      }
    }

    return { cleanText, toolCalls };
  };

  // Execute tool calls and return results
  const executeToolCalls = async (toolCalls: ToolCall[]): Promise<ToolCall[]> => {
    const results: ToolCall[] = [];

    for (const call of toolCalls) {
      try {
        const result = await executeTool(call.name, call.arguments);
        results.push({ ...call, result });
      } catch (e) {
        results.push({
          ...call,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return results;
  };

  // Send a message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const session = await getSession();

        if (!session) {
          // Fallback: Try to parse as direct tool call
          const tools = getRegisteredTools();
          const toolNames = tools.map((t) => t.name);

          const fallbackMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `window.ai is not available in this browser. You can still use tools directly.\n\nAvailable tools: ${toolNames.join(", ")}\n\nTo use window.ai, enable Chrome's built-in AI features at chrome://flags/#optimization-guide-on-device-model`,
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, fallbackMessage]);
          return;
        }

        // Build conversation context from the ref so we always see the
        // latest state, including the userMessage we just appended above.
        const currentMessages = messagesRef.current;
        const conversationHistory = currentMessages
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n");
        const fullPrompt = conversationHistory
          ? `${conversationHistory}\nuser: ${content}`
          : content;

        const response = await session.prompt(fullPrompt);

        // Parse tool calls from the response
        const { cleanText, toolCalls } = parseToolCalls(response);

        // Execute any tool calls
        let executedCalls: ToolCall[] = [];
        if (toolCalls.length > 0) {
          executedCalls = await executeToolCalls(toolCalls);
        }

        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: cleanText || response,
          timestamp: new Date(),
          toolCalls: executedCalls.length > 0 ? executedCalls : undefined,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // If tools were called, send results back to the AI for a follow-up
        if (executedCalls.length > 0) {
          const toolResultsPrompt = executedCalls
            .map((tc) => {
              if (tc.error) {
                return `Tool "${tc.name}" failed: ${tc.error}`;
              }
              return `Tool "${tc.name}" result: ${JSON.stringify(tc.result)}`;
            })
            .join("\n");

          const followUp = await session.prompt(
            `The tools have been executed. Here are the results:\n${toolResultsPrompt}\n\nPlease provide a brief summary of what was done.`
          );

          const followUpMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: followUp,
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, followUpMessage]);
        }
      } catch (e) {
        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Error: ${e instanceof Error ? e.message : String(e)}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [getSession]
  );

  // Clear conversation
  const clearMessages = useCallback(() => {
    setMessages([]);
    if (sessionRef.current) {
      sessionRef.current.destroy();
      sessionRef.current = null;
    }
  }, []);

  return {
    messages,
    isLoading,
    isAvailable,
    capabilities,
    sendMessage,
    clearMessages,
    getRegisteredTools,
  };
}
