import { MCPServer } from '@mastra/mcp'
import { assistantTools } from './tools'

/**
 * Exposes the same Mastra tools the assistant uses to external MCP clients.
 * `requireApproval` only gates agent runs; MCP clients confirm tool calls on their side.
 */
export const mcpServer = new MCPServer({
  id: 'modern-api-studio',
  name: 'modern-api-studio',
  version: '1.0.0',
  tools: assistantTools,
})
