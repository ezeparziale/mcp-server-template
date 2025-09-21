import dotenv from "dotenv"
import express from "express"
import { randomUUID } from "node:crypto"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js"
import { getCurrentWeatherTool } from "./tools/weather.js"
import cors from "cors"
import { logger } from "./logger.js"

dotenv.config()

const PORT = process.env.PORT || 3000
const ORIGIN = process.env.ORIGIN

const app = express()
app.use(express.json())
app.use(
  cors({
    origin: ORIGIN ? (ORIGIN.includes(",") ? ORIGIN.split(",") : ORIGIN) : "*",
    exposedHeaders: ["Mcp-Session-Id"],
    allowedHeaders: ["Content-Type", "mcp-session-id"],
  }),
)

// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {}

// Handle POST requests for client-to-server communication
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
      },
      enableDnsRebindingProtection: false,
      allowedHosts: ["127.0.0.1", "localhost"],

      // DNS rebinding protection is disabled by default for backwards compatibility. If you are running this server
      // locally, make sure to set:
      // enableDnsRebindingProtection: true,
      // allowedHosts: ['127.0.0.1'],
    })

    // Clean up transport when closed
    transport.onclose = () => {
      if (transport.sessionId) {
        delete transports[transport.sessionId]
      }
    }
    const server = new McpServer({
      name: "example-server",
      version: "1.0.0",
    })

    server.registerTool(
      getCurrentWeatherTool.name,
      getCurrentWeatherTool,
      getCurrentWeatherTool.execute,
    )

    // Connect to the MCP server
    await server.connect(transport)
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
const handleSessionRequest = async (req: express.Request, res: express.Response) => {
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

app.get("/health", (_req, res) => {
  res.status(200).send("OK")
})

app.listen(PORT, () => {
  logger.info(`Server is running on http://0.0.0.0:${PORT}`)
})
