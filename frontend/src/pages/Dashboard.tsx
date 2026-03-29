import { useState, useCallback, FormEvent, useRef } from 'react'
import { Loader2, Send } from 'lucide-react'
import { useQuerySubmit } from '@/hooks/useQuery'
import ConceptMap3D from '@/components/map/ConceptMap3D'
import FourColumnView from '@/components/query/FourColumnView'

export default function Dashboard() {
  const { submitQuery, isLoading, response } = useQuerySubmit()
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)
  const [freeFormText, setFreeFormText] = useState('')
  const hasPanes = response !== null || isLoading
  const inputRef = useRef<HTMLInputElement>(null)

  const handleNodeSelect = useCallback(
    (label: string) => {
      setSelectedLabel(label)
      submitQuery(label)
    },
    [submitQuery],
  )

  const handleFreeFormSubmit = (e: FormEvent) => {
    e.preventDefault()
    const q = freeFormText.trim()
    if (!q || isLoading) return
    setSelectedLabel(q)
    submitQuery(q)
    setFreeFormText('')
  }

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>

      {/* ── 3D Concept Map (hero) ──────────────────────────────────── */}
      <div
        className="relative flex-shrink-0"
        style={{ height: hasPanes ? '50vh' : 'calc(100% - 52px)', background: '#0C0B22', minHeight: 320 }}
      >
        <ConceptMap3D onNodeSelect={handleNodeSelect} />

        {/* Loading indicator overlay (Ollama is slow — must not feel broken) */}
        {isLoading && selectedLabel && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10
                          flex items-center gap-2 px-4 py-2 rounded-full
                          bg-white/10 backdrop-blur-sm border border-white/20
                          text-white text-sm whitespace-nowrap">
            <Loader2 className="h-4 w-4 animate-spin text-purple-300" />
            <span className="text-purple-100">
              Loading <span className="font-semibold">"{selectedLabel}"</span>…
            </span>
          </div>
        )}

        {/* Hint — only shown before any selection */}
        {!hasPanes && !isLoading && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10
                          px-3 py-1.5 rounded-full text-xs
                          text-white/50 border border-white/10 bg-white/5 whitespace-nowrap">
            Click a node to learn · Double-click to expand
          </div>
        )}

      </div>

      {/* ── Four Panes (appear after node click) ──────────────────────────── */}
      {hasPanes && (
        <div
          className="flex-1 overflow-auto border-t border-gray-200 bg-gray-50 p-4"
          style={{ minHeight: 0 }}
        >
          {selectedLabel && (
            <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">
              {selectedLabel}
            </p>
          )}
          <FourColumnView answer={response?.answer ?? null} isLoading={isLoading} />
        </div>
      )}

      {/* ── Free-form question bar (bottom, less prominent) ───────────────── */}
      <form
        onSubmit={handleFreeFormSubmit}
        className="flex-shrink-0 flex items-center gap-2 border-t bg-white px-4"
        style={{ height: 52 }}
      >
        <span className="text-xs text-gray-600 whitespace-nowrap">Ask a free-form question</span>
        <input
          ref={inputRef}
          type="text"
          value={freeFormText}
          onChange={(e) => setFreeFormText(e.target.value)}
          placeholder="e.g. What is polymorphism?"
          disabled={isLoading}
          className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded
                     focus:outline-none focus:ring-1 focus:ring-purple-400
                     disabled:opacity-50 bg-gray-50"
        />
        <button
          type="submit"
          disabled={isLoading || !freeFormText.trim()}
          className="p-1.5 text-purple-600 hover:text-purple-800 disabled:opacity-30
                     transition-colors"
          title="Submit"
        >
          {isLoading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Send className="h-4 w-4" />
          }
        </button>
      </form>
    </div>
  )
}
