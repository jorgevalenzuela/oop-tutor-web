import { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'

interface Pair {
  concept: string
  definition: string
}

interface MatchingQuestionProps {
  pairs: Pair[]
  value: string
  onChange: (v: string) => void
  submitted: boolean
}

function DraggableDefinition({ id, text, matched }: { id: string; text: string; matched: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, disabled: matched })
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor: matched ? 'rgba(22,163,74,0.08)' : 'white',
        border: `1px solid ${matched ? 'rgba(22,163,74,0.4)' : 'rgba(60,52,137,0.2)'}`,
        color: matched ? '#15803d' : '#2d2450',
        opacity: isDragging ? 0.5 : 1,
      }}
      {...listeners}
      {...attributes}
      className="px-3 py-2 rounded-lg text-sm cursor-grab active:cursor-grabbing select-none transition-opacity"
    >
      {text}
    </div>
  )
}

function DroppableConcept({
  concept,
  matchedDefinition,
  onClear,
  submitted,
}: {
  concept: string
  matchedDefinition: string | null
  onClear: () => void
  submitted: boolean
}) {
  const { isOver, setNodeRef } = useDroppable({ id: concept })

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex-1 px-3 py-2 rounded-lg text-sm font-medium"
        style={{
          backgroundColor: 'rgba(60,52,137,0.08)',
          border: '1px solid rgba(60,52,137,0.2)',
          color: '#1e1635',
        }}
      >
        {concept}
      </div>
      <span style={{ color: '#9e95c7' }}>→</span>
      <div
        ref={setNodeRef}
        className="flex-1 px-3 py-2 rounded-lg text-sm min-h-[38px] flex items-center justify-between transition-all"
        style={{
          backgroundColor: isOver ? 'rgba(60,52,137,0.12)' : matchedDefinition ? 'rgba(22,163,74,0.07)' : 'white',
          border: `1px dashed ${isOver ? '#3C3489' : matchedDefinition ? 'rgba(22,163,74,0.4)' : 'rgba(60,52,137,0.2)'}`,
          color: matchedDefinition ? '#15803d' : '#9e95c7',
        }}
      >
        <span>{matchedDefinition ?? 'Drop here…'}</span>
        {matchedDefinition && !submitted && (
          <button
            onClick={onClear}
            className="ml-2 text-xs flex-shrink-0 hover:text-red-500 transition-colors"
            style={{ color: '#9e95c7' }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

export default function MatchingQuestion({ pairs, value, onChange, submitted }: MatchingQuestionProps) {
  const [matches, setMatches] = useState<Record<string, string>>({})

  const [shuffledDefs] = useState(() =>
    [...pairs.map(p => p.definition)].sort(() => Math.random() - 0.5)
  )

  useEffect(() => {
    if (value) {
      try {
        const parsed = JSON.parse(value) as { concept: string; definition: string }[]
        const m: Record<string, string> = {}
        parsed.forEach(p => { m[p.concept] = p.definition })
        setMatches(m)
      } catch { /* ignore */ }
    }
  }, [])

  function handleDragEnd(event: DragEndEvent) {
    if (submitted) return
    const { active, over } = event
    if (!over) return

    const definition = active.id as string
    const concept = over.id as string

    setMatches(prev => {
      const updated = { ...prev }
      for (const c in updated) {
        if (updated[c] === definition) delete updated[c]
      }
      updated[concept] = definition
      onChange(JSON.stringify(pairs.map(p => ({ concept: p.concept, definition: updated[p.concept] ?? '' }))))
      return updated
    })
  }

  function clearMatch(concept: string) {
    setMatches(prev => {
      const updated = { ...prev }
      delete updated[concept]
      onChange(JSON.stringify(pairs.map(p => ({ concept: p.concept, definition: updated[p.concept] ?? '' }))))
      return updated
    })
  }

  const matchedDefs = new Set(Object.values(matches))

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        <div className="space-y-2.5">
          {pairs.map(p => (
            <DroppableConcept
              key={p.concept}
              concept={p.concept}
              matchedDefinition={matches[p.concept] ?? null}
              onClear={() => clearMatch(p.concept)}
              submitted={submitted}
            />
          ))}
        </div>

        <div>
          <p className="text-xs mb-2" style={{ color: '#9e95c7' }}>Drag definitions to match:</p>
          <div className="flex flex-wrap gap-2">
            {shuffledDefs.map(def => (
              <DraggableDefinition
                key={def}
                id={def}
                text={def}
                matched={matchedDefs.has(def)}
              />
            ))}
          </div>
        </div>
      </div>
    </DndContext>
  )
}
