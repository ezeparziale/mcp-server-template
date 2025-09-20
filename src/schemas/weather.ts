import { z } from "zod"

export const GeocodingSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country_code: z.string(),
        timezone: z.string(),
        country: z.string(),
      }),
    )
    .nonempty(),
})

export type Geocoding = z.infer<typeof GeocodingSchema>

export const WeatherSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  generationtime_ms: z.number(),
  utc_offset_seconds: z.number(),
  timezone: z.string(),
  timezone_abbreviation: z.string(),
  elevation: z.number(),
  hourly_units: z.object({
    time: z.string(),
    temperature_2m: z.string(),
    rain: z.string(),
    relative_humidity_2m: z.string(),
    visibility: z.string(),
    weather_code: z.string(),
    precipitation: z.string(),
    precipitation_probability: z.string(),
    apparent_temperature: z.string(),
    dew_point_2m: z.string(),
  }),
  hourly: z.object({
    time: z.array(z.string()),
    temperature_2m: z.array(z.number()),
    rain: z.array(z.number()),
    relative_humidity_2m: z.array(z.number()),
    visibility: z.array(z.number()),
    weather_code: z.array(z.number()),
    precipitation: z.array(z.number()),
    precipitation_probability: z.array(z.number()),
    apparent_temperature: z.array(z.number()),
    dew_point_2m: z.array(z.number()),
  }),
})

export type Weather = z.infer<typeof WeatherSchema>
