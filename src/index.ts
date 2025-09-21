import { logger } from "./logger.js"
import dotenv from "dotenv"
import { MCPServer } from "./server.js"
dotenv.config()

const MCP_MODE = process.env.MCP_MODE || "stdio"

async function main() {
  logger.info(`Mode: ${MCP_MODE}`)
  const server = new MCPServer()
  await server.run(MCP_MODE)
  logger.info("🚀 MCP Server is running...")
}

main().catch((error) => {
  logger.error(`🚨 failed to start server: ${error}`)
  process.exit(1)
})
