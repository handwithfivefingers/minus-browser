import { IconCheck, IconCopy } from "@tabler/icons-react";
import { type ComponentPropsWithoutRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "../hooks/useAiChat";

function CodeBlock({ children, className }: { children: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-2">
      <div className="flex items-center justify-between bg-slate-800 rounded-t-lg px-3 py-1.5 text-[10px] text-slate-400">
        <span>{className?.replace("language-", "") || "code"}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors"
        >
          {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="bg-slate-900 text-slate-100 rounded-b-lg p-3 overflow-x-auto text-xs leading-relaxed m-0">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-slate-100 text-pink-600 px-1 py-0.5 rounded text-xs font-mono">
      {children}
    </code>
  );
}

type CodeProps = ComponentPropsWithoutRef<"code"> & { className?: string };

const MessageBubble = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {isUser ? (
        <div className="max-w-[85%] bg-indigo-500 text-white rounded-2xl rounded-tr-sm px-3 py-2 text-sm leading-relaxed">
          {message.content}
        </div>
      ) : (
        <div className="max-w-[92%] bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-sm px-3 py-2 text-sm leading-relaxed text-slate-800">
          {message.content ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                code({ className, children, ...props }: CodeProps) {
                  const isInline = !className;
                  const content = String(children).replace(/\n$/, "");
                  if (isInline) {
                    return <InlineCode>{children}</InlineCode>;
                  }
                  return <CodeBlock className={className}>{content}</CodeBlock>;
                },
                pre({ children }) {
                  return <>{children}</>;
                },
                a({ href, children }) {
                  return (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-500 underline">
                      {children}
                    </a>
                  );
                },
                ul({ children }) {
                  return <ul className="list-disc pl-4 my-1 space-y-0.5">{children}</ul>;
                },
                ol({ children }) {
                  return <ol className="list-decimal pl-4 my-1 space-y-0.5">{children}</ol>;
                },
                p({ children }) {
                  return <p className="mb-1 last:mb-0">{children}</p>;
                },
                strong({ children }) {
                  return <strong className="font-semibold">{children}</strong>;
                },
              }}
            />
          ) : (
            <span className="text-slate-400 italic">Thinking...</span>
          )}
        </div>
      )}
    </div>
  );
};

export { MessageBubble };
