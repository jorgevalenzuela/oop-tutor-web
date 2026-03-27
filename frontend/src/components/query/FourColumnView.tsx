import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Maximize2, X } from 'lucide-react'
import { StructuredAnswer } from '@/services/api'
import UMLDiagram from './UMLDiagram'
import CodeBlock from './CodeBlock'

interface FourColumnViewProps {
  answer: StructuredAnswer | null
  isLoading: boolean
}

function ColumnSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-full"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
    </div>
  )
}

interface ColumnProps {
  title: string
  content: string | null
  isLoading: boolean
  expandable?: boolean
  renderContent?: (content: string) => React.ReactNode
}

function Column({ title, content, isLoading, expandable, renderContent }: ColumnProps) {
  const [open, setOpen] = useState(false)

  const body = isLoading ? (
    <ColumnSkeleton />
  ) : content ? (
    renderContent ? renderContent(content) : (
      <div className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{content}</div>
    )
  ) : (
    <div className="text-sm text-muted-foreground italic">No content</div>
  )

  return (
    <>
      <div className="flex flex-col bg-white rounded-lg border border-border overflow-hidden">
        <div className="bg-accent/60 px-4 py-2 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground">{title}</h3>
          {expandable && content && !isLoading && (
            <button
              onClick={() => setOpen(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Expand"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex-1 p-4 overflow-auto min-h-[250px] max-h-[500px] bg-white">
          {body}
        </div>
      </div>

      {expandable && (
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
            <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-4xl max-h-[85vh] bg-white rounded-xl shadow-xl flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-accent/60 rounded-t-xl">
                <Dialog.Title className="font-semibold text-foreground">{title}</Dialog.Title>
                <Dialog.Close className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-5 w-5" />
                </Dialog.Close>
              </div>
              <div className="flex-1 overflow-auto p-6">
                {content && (renderContent ? renderContent(content) : (
                  <div className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{content}</div>
                ))}
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </>
  )
}

export default function FourColumnView({ answer, isLoading }: FourColumnViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Column
        title="English"
        content={answer?.english ?? null}
        isLoading={isLoading}
      />
      <Column
        title="OOP"
        content={answer?.oop ?? null}
        isLoading={isLoading}
      />
      <Column
        title="UML"
        content={answer?.uml ?? null}
        isLoading={isLoading}
        expandable
        renderContent={(content) => <UMLDiagram mermaidSyntax={content} />}
      />
      <Column
        title="C#"
        content={answer?.csharp ?? null}
        isLoading={isLoading}
        expandable
        renderContent={(content) => <CodeBlock code={content} language="csharp" />}
      />
    </div>
  )
}
