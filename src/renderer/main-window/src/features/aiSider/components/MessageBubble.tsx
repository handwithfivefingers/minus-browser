import { IconCheck, IconCopy } from '@tabler/icons-react'
import { type ComponentPropsWithoutRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'

import type { ChatMessage } from '../stores/useAiSidebarStore'

function CodeBlock({
  children,
  className,
  codeString,
}: {
  children: React.ReactNode
  className?: string
  codeString?: string
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeString || String(children))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="group relative my-2">
      <div className="flex items-center justify-between rounded-t-lg bg-slate-800 px-3 py-1.5 text-[10px] text-slate-400">
        <span>{className?.replace('language-', '') || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex cursor-pointer items-center gap-1 transition-colors hover:text-white"
        >
          {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="m-0 overflow-x-auto rounded-b-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">
        <code>{children}</code>
      </pre>
    </div>
  )
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs text-pink-600">{children}</code>
}

type CodeProps = ComponentPropsWithoutRef<'code'> & { className?: string }

const MessageBubble = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {isUser ? (
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-indigo-500 px-3 py-2 text-sm leading-relaxed text-white">
          {message.content}
        </div>
      ) : (
        <div className="max-w-[92%] rounded-2xl rounded-tl-sm border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-800">
          {message.content ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                code({ className, children, ...props }: CodeProps) {
                  const isInline = !className
                  const codeString = String(children).replace(/\n$/, '')
                  if (isInline) {
                    return <InlineCode>{children}</InlineCode>
                  }
                  return (
                    <CodeBlock className={className} codeString={codeString}>
                      {children}
                    </CodeBlock>
                  )
                },
                pre({ children }) {
                  return <>{children}</>
                },
                a({ href, children }) {
                  return (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-500 underline">
                      {children}
                    </a>
                  )
                },
                ul({ children }) {
                  return <ul className="my-1 list-disc space-y-0.5 pl-4">{children}</ul>
                },
                ol({ children }) {
                  return <ol className="my-1 list-decimal space-y-0.5 pl-4">{children}</ol>
                },
                p({ children }) {
                  return <p className="mb-1 last:mb-0">{children}</p>
                },
                strong({ children }) {
                  return <strong className="font-semibold">{children}</strong>
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          ) : (
            <span className="text-slate-400 italic">Thinking...</span>
          )}
        </div>
      )}
    </div>
  )
}

export { MessageBubble }
