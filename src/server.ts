import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { logger } from "./logger.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import * as pjson from "../package.json" with { type: "json" }
import express, { Express } from "express"
import cors from "cors"
import { randomUUID } from "node:crypto"
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js"
import { tools } from "./tools/index.js"

const STDIO_OPTION = "stdio"
const STREAMABLE_HTTP_OPTION = "http"

const NAME = pjson.name
const VERSION = pjson.version

const PORT = process.env.PORT || 3000
const ORIGIN = process.env.ORIGIN
const ALLOWED_HOSTS = process.env.ALLOWED_HOSTS?.split(",") ?? [
  "127.0.0.1",
  "localhost",
]

export class MCPServer {
  private readonly server: McpServer

  constructor() {
    this.server = new McpServer({
      name: NAME,
      version: VERSION,
      capabilities: {
        tools: {},
      },
    })

    tools.forEach((tool) => {
      this.server.registerTool(tool.name, tool, tool.execute)
      logger.info(`🔧 Tool registered: ${tool.name}`)
    })
  }

  async run(transportType: string): Promise<void> {
    let transport = null
    switch (transportType) {
      case STDIO_OPTION:
        transport = new StdioServerTransport()
        await this.server.connect(transport)
        logger.info("🚀 MCP Server is running...")
        break
      case STREAMABLE_HTTP_OPTION: {
        const app = express()
        app.use(express.json())

        const allowedOrigins =
          ORIGIN?.split(",").map((o) => o.trim()) ??
          (process.env.NODE_ENV === "production" ? [] : ["*"])

        app.use(
          cors({
            origin: allowedOrigins,
            exposedHeaders: ["Mcp-Session-Id"],
            allowedHeaders: ["Content-Type", "mcp-session-id"],
          }),
        )
        this.registerRoutes(app)
        app.listen(PORT, () => {
          logger.info(`Server is running on http://0.0.0.0:${PORT}`)
        })
        break
      }
      default:
        throw new Error(`Invalid transport type: ${transportType}`)
    }
  }

  private registerRoutes(app: Express) {
    const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {}

    app.post("/mcp", async (req, res) => {
      // Check for existing session ID
      const sessionId = req.headers["mcp-session-id"] as string | undefined
      let transport: StreamableHTTPServerTransport

      if (sessionId && transports[sessionId]) {
        // Reuse existing transport
        transport = transports[sessionId]
      } else if (!sessionId && isInitializeRequest(req.body)) {
        // New initialization request
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sessionId) => {
            // Store the transport by session ID
            transports[sessionId] = transport
            logger.info(`🆕 New MCP session created: ${sessionId}`)
          },
          enableDnsRebindingProtection: process.env.NODE_ENV === "production",
          allowedHosts: ALLOWED_HOSTS,

          // DNS rebinding protection is disabled by default for backwards compatibility. If you are running this server
          // locally, make sure to set:
          // enableDnsRebindingProtection: true,
          // allowedHosts: ['127.0.0.1'],
        })

        // Clean up transport when closed
        transport.onclose = () => {
          if (transport.sessionId) {
            delete transports[transport.sessionId]
            logger.info(`❌ MCP session closed: ${transport.sessionId}`)
          }
        }

        // Connect to the MCP server
        await this.server.connect(transport)
        logger.info("🚀 MCP Server is running...")
      } else {
        // Invalid request
        res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Bad Request: No valid session ID provided",
          },
          id: null,
        })
        return
      }

      // Handle the request
      await transport.handleRequest(req, res, req.body)
    })

    // Reusable handler for GET and DELETE requests
    const handleSessionRequest = async (
      req: express.Request,
      res: express.Response,
    ) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined
      if (!sessionId || !transports[sessionId]) {
        res.status(400).send("Invalid or missing session ID")
        return
      }

      const transport = transports[sessionId]
      await transport.handleRequest(req, res)
    }

    // Handle GET requests for server-to-client notifications via SSE
    app.get("/mcp", handleSessionRequest)

    // Handle DELETE requests for session termination
    app.delete("/mcp", handleSessionRequest)

    // Health check
    app.get("/health", (_req, res) => {
      res.status(200).send("OK")
    })
  }
}
