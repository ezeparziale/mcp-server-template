import { z } from "zod"
import { getCurrentWeather } from "@/lib/weather"

const getCurrentWeatherInputSchema = z.object({
  city: z.string().describe("The city to get the weather for"),
})

type GetCurrentWeatherInput = z.infer<typeof getCurrentWeatherInputSchema>

export const getCurrentWeatherTool = {
  name: "get-current-weather",
  description: "Get the current weather in a given location",
  inputSchema: getCurrentWeatherInputSchema.shape,
  execute: async ({ city }: GetCurrentWeatherInput) => {
    return await getCurrentWeather(city)
  },
}
