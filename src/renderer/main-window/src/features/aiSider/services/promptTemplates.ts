export const LANGUAGE_MAP: Record<string, string> = {
  english: 'English',
  vietnamese: 'Vietnamese',
  japanese: 'Japanese',
  korean: 'Korean',
}

function getLanguageInstruction(): string {
  try {
    const raw = localStorage.getItem('minus_ai_settings')
    if (raw) {
      const settings = JSON.parse(raw)
      const lang = settings.language || 'english'
      const label = LANGUAGE_MAP[lang] || 'English'
      return `\n\nImportant: Respond in ${label}.`
    }
  } catch {
    // ignore
  }
  return ''
}

export const SUMMARY_PROMPT = `You are a helpful assistant that summarizes web page content.
Provide a clear, concise summary of the following content.
Focus on the key points, main ideas, and important details.
Use bullet points for clarity when appropriate.`

export const EXPLAIN_PROMPT = `You are a helpful assistant that explains text in a simple, easy-to-understand way.
Break down complex concepts, define unfamiliar terms, and provide context.`

export const FIX_GRAMMAR_PROMPT = `You are a professional editor. Fix any grammar, spelling, and punctuation errors in the following text.
Preserve the original meaning and tone. Return only the corrected text.`

export const SIMPLIFY_PROMPT = `You are a helpful assistant that simplifies complex text.
Rewrite the following content in simpler language that is easy to understand.
Keep all key information but use simpler vocabulary and shorter sentences.`

export type ToneType = 'professional' | 'casual' | 'friendly' | 'formal' | 'humorous'

export function getChangeTonePrompt(tone: ToneType): string {
  return `You are a writing assistant. Rewrite the following text in a ${tone} tone.
Preserve the original meaning and key information.
Return only the rewritten text.`
}

export function buildSummaryMessages(pageContent: string, length: 'short' | 'detailed' = 'detailed') {
  const lengthInstruction =
    length === 'short'
      ? 'Keep the summary very brief, no more than 3-4 sentences.'
      : 'Provide a comprehensive summary with bullet points covering all key sections.'

  return [
    { role: 'system' as const, content: SUMMARY_PROMPT + getLanguageInstruction() },
    {
      role: 'user' as const,
      content: `${lengthInstruction}\n\nContent to summarize:\n\n${pageContent}`,
    },
  ]
}

export function buildExplainMessages(selectedText: string) {
  return [
    { role: 'system' as const, content: EXPLAIN_PROMPT + getLanguageInstruction() },
    {
      role: 'user' as const,
      content: `Please explain the following text:\n\n${selectedText}`,
    },
  ]
}

export type GenerateTemplate = 'email' | 'blog' | 'social' | 'code' | 'custom'

const GENERATE_SYSTEM_PROMPTS: Record<GenerateTemplate, string> = {
  email: "You are a professional email writer. Write clear, effective emails based on the user's instructions.",
  blog: 'You are a skilled blog writer. Write engaging blog posts with proper structure, headings, and flow.',
  social:
    'You are a social media content creator. Write concise, engaging social media posts optimized for engagement.',
  code: 'You are an expert programmer. Generate clean, well-structured code following best practices.',
  custom: "You are a helpful writing assistant. Generate content based on the user's request.",
}

const GENERATE_USER_PROMPTS: Record<GenerateTemplate, string> = {
  email: 'Write an email based on the following request:\n\n',
  blog: 'Write a blog post based on the following topic:\n\n',
  social: 'Write a social media post based on the following:\n\n',
  code: 'Generate code for the following requirement:\n\n',
  custom: '',
}

export function buildGenerateMessages(template: GenerateTemplate, input: string) {
  return [
    { role: 'system' as const, content: GENERATE_SYSTEM_PROMPTS[template] + getLanguageInstruction() },
    {
      role: 'user' as const,
      content: `${GENERATE_USER_PROMPTS[template]}${input}`,
    },
  ]
}

export function buildQuickActionMessages(action: string, text: string) {
  let systemPrompt = ''
  switch (action) {
    case 'fix-grammar':
      systemPrompt = FIX_GRAMMAR_PROMPT
      break
    case 'simplify':
      systemPrompt = SIMPLIFY_PROMPT
      break
    case 'professional':
      systemPrompt = getChangeTonePrompt('professional')
      break
    case 'casual':
      systemPrompt = getChangeTonePrompt('casual')
      break
    case 'friendly':
      systemPrompt = getChangeTonePrompt('friendly')
      break
    case 'formal':
      systemPrompt = getChangeTonePrompt('formal')
      break
    default:
      systemPrompt = 'You are a helpful writing assistant.'
  }
  return [
    { role: 'system' as const, content: systemPrompt + getLanguageInstruction() },
    { role: 'user' as const, content: text },
  ]
}
