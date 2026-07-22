import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
// const defaultPreference: Preference = {
//   sourceLanguage: "auto",
//   targetLanguage: "en",
//   autoTranslate: true,
//   alwaysTranslateDomains: [],
//   neverTranslateDomains: [],
//   neverTranslateLanguages: [],
// };
const preference = z.object({
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
  autoTranslate: z.boolean(),
  alwaysTranslateDomains: z.string().optional(),
  neverTranslateDomains: z.string().optional(),
  neverTranslateLanguages: z.string().optional(),
})

export const preferenceSchema = zodResolver(preference)
export type PreferenceSchemaType = z.infer<typeof preference>
