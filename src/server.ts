import * as pjson from "../package.json" with { type: "json" }

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { getCurrentWeatherTool } from "./tools/weather.js"

const VERSION = pjson.version

const server = new McpServer({
  name: "mcp-server-template",
  version: VERSION,
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
  console.log("🚀 MCP Server is running...")
  console.log(`Version: ${VERSION}`)
}

main().catch((error) => {
  console.error(`🚨 failed to start server: ${error}`)
})
