import { chatCompletion } from './aiProvider'
import { getPageText } from './pageReader'
import { buildSummaryMessages } from './promptTemplates'

export async function summarizePage(length: 'short' | 'detailed' = 'detailed'): Promise<string> {
  const pageContent = await getPageText()
  if (!pageContent) {
    throw new Error('No page content found. Make sure a tab is open and loaded.')
  }
  const messages = buildSummaryMessages(pageContent.slice(0, 30000), length)
  return chatCompletion(messages, { temperature: 0.3 })
}
