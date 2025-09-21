import winston, { format } from "winston"

export const logger = winston.createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json(),
  ),
  transports: [
    new winston.transports.Console({
      stderrLevels: ["info", "error"],
    }),
  ],
})
