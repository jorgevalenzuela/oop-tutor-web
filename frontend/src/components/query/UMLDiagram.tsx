import { useEffect, useRef, useState, useId } from 'react'
import mermaid from 'mermaid'

interface UMLDiagramProps {
  mermaidSyntax: string
}

// Initialize mermaid once
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
})

function extractMermaidCode(content: string): string {
  // Try to extract mermaid code from markdown code block
  const mermaidBlockMatch = content.match(/```mermaid\s*([\s\S]*?)```/i)
  if (mermaidBlockMatch) {
    return mermaidBlockMatch[1].trim()
  }

  // Try to extract from any code block
  const codeBlockMatch = content.match(/```\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim()
  }

  // Return content as-is if no code block found
  return content.trim()
}

export default function UMLDiagram({ mermaidSyntax }: UMLDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const uniqueId = useId().replace(/:/g, '-')

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current) return

      setError(null)

      const code = extractMermaidCode(mermaidSyntax)

      if (!code) {
        setError('No diagram code found')
        return
      }

      try {
        // Clear previous content
        containerRef.current.innerHTML = ''

        // Validate and render the diagram
        const { svg } = await mermaid.render(`mermaid-${uniqueId}`, code)
        containerRef.current.innerHTML = svg
      } catch (err) {
        console.error('Mermaid render error:', err)
        setError(`Failed to render diagram: ${err instanceof Error ? err.message : 'Unknown error'}`)
        // Show the raw code as fallback
        if (containerRef.current) {
          containerRef.current.innerHTML = ''
        }
      }
    }

    renderDiagram()
  }, [mermaidSyntax, uniqueId])

  if (error) {
    return (
      <div className="space-y-2">
        <div className="text-xs text-red-500">{error}</div>
        <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto whitespace-pre-wrap">
          {extractMermaidCode(mermaidSyntax)}
        </pre>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="uml-diagram flex justify-center items-center min-h-[100px]"
    />
  )
}
