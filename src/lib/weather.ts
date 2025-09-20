import { GeocodingSchema, WeatherSchema } from "../schemas/weather.js"
import type { McpTextResponse } from "../types/types.js"

export async function getCurrentWeather(city: string): Promise<McpTextResponse> {
  console.info(`Fetching weather data for ${city}`)
  const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1&language=en&format=json`

  try {
    // Geocoding request
    const geoResponse = await fetch(geocodingUrl)
    if (!geoResponse.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to fetch geocoding data: ${geoResponse.statusText}`,
          },
        ],
      }
    }
    const geoData = await geoResponse.json()
    const parsedGeoData = GeocodingSchema.safeParse(geoData)

    if (
      !parsedGeoData.success ||
      !parsedGeoData.data.results ||
      parsedGeoData.data.results.length === 0
    ) {
      return {
        content: [{ type: "text", text: "Invalid geocoding data or city not found." }],
      }
    }

    const cityData = parsedGeoData.data.results[0]
    const { latitude, longitude } = cityData

    // Weather request
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,rain,relative_humidity_2m,visibility,weather_code,precipitation,precipitation_probability,apparent_temperature,dew_point_2m&past_days=1`
    const weatherResponse = await fetch(weatherUrl)
    if (!weatherResponse.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to fetch weather data: ${weatherResponse.statusText}`,
          },
        ],
      }
    }
    const weatherData = await weatherResponse.json()
    const parsedWeatherData = WeatherSchema.safeParse(weatherData)

    if (!parsedWeatherData.success) {
      return { content: [{ type: "text", text: "Invalid weather data." }] }
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              city: cityData,
              weather: parsedWeatherData.data,
            },
            null,
            2,
          ),
        },
      ],
    }
  } catch (error) {
    if (error instanceof Error) {
      return { content: [{ type: "text", text: error.message }] }
    }
    return { content: [{ type: "text", text: "An unknown error occurred." }] }
  }
}
