import { useEffect, useRef } from 'react'
import Prism from 'prismjs'
import 'prismjs/components/prism-csharp'
import 'prismjs/themes/prism.css'

interface CodeBlockProps {
  code: string
  language: string
}

function extractCode(content: string): string {
  // Try to extract code from markdown code block
  const codeBlockMatch = content.match(/```(?:\w+)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim()
  }

  // Return content as-is if no code block found
  return content.trim()
}

export default function CodeBlock({ code, language }: CodeBlockProps) {
  const codeRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current)
    }
  }, [code])

  const extractedCode = extractCode(code)

  return (
    <pre className="text-sm overflow-auto rounded bg-gray-50 p-2">
      <code ref={codeRef} className={`language-${language}`}>
        {extractedCode}
      </code>
    </pre>
  )
}
