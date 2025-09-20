import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { getCurrentWeatherTool } from "@/tools/weather"

const server = new McpServer({
  name: "mcp-template",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
    prompts: {},
  },
})

server.registerTool(
  getCurrentWeatherTool.name,
  getCurrentWeatherTool,
  getCurrentWeatherTool.execute,
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main()
