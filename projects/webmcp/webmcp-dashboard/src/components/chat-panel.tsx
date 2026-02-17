import { useState, useRef, useEffect, type ReactNode } from 'react'
import { useWindowAI, type ChatMessage } from '@/lib/webmcp'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function ChatPanel() {
  const { messages, isLoading, isAvailable, sendMessage, clearMessages } = useWindowAI()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage(input)
    setInput('')
  }

  return (
    <div className="flex flex-col h-full border-l bg-card">
      <div className="flex items-center justify-between p-3 border-b">
        <div>
          <h3 className="font-semibold text-sm">AI Chat</h3>
          <p className="text-xs text-muted-foreground">
            {isAvailable === null ? 'Checking...' : isAvailable ? 'window.ai ready' : 'window.ai unavailable'}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={clearMessages}>Clear</Button>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            <p className="font-medium">WebMCP + window.ai</p>
            <p className="text-xs mt-1">Ask me to manage entities, memory blocks, or run SQL queries.</p>
          </div>
        )}
        {messages.map((msg: ChatMessage) => (
          <div key={msg.id} className={cn(
            "rounded-lg p-3 text-sm",
            msg.role === 'user' ? "bg-primary text-primary-foreground ml-8" : "bg-muted mr-8"
          )}>
            <p className="whitespace-pre-wrap">{msg.content}</p>
            {msg.toolCalls && msg.toolCalls.length > 0 && (
              <div className="mt-2 space-y-1">
                {msg.toolCalls.map((tc, i) => (
                  <div key={i} className="text-xs bg-background/50 rounded p-2 font-mono">
                    <span className="text-blue-500">{tc.name}</span>
                    {tc.error && <span className="text-destructive ml-2">{String(tc.error)}</span>}
                    {tc.result != null && <span className="text-green-500 ml-2">Done</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="bg-muted rounded-lg p-3 mr-8 animate-pulse text-sm text-muted-foreground">
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your memories..."
          className="flex-1 bg-background border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          disabled={isLoading}
        />
        <Button type="submit" size="sm" disabled={isLoading || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  )
}
