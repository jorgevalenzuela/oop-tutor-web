import { useEffect, useState } from 'react'
import { assessmentApi, MasteryConfig } from '../../services/assessmentApi'
import { getAssessableNodes } from '../../data/oopHierarchy'

// Single source of truth — every concept/category node in the map
const OOP_CONCEPTS = getAssessableNodes().map(n => n.label)

const DEFAULTS = { score_threshold: 0.8, consecutive_required: 3, required_for_cert: 1 }

interface ConceptRowState {
  concept: string
  scoreThreshold: string
  consecutiveRequired: string
  requiredForCert: boolean
  isCustom: boolean
  saving: boolean
  saved: boolean
  error: string
}

function toRow(concept: string, cfg: MasteryConfig | null): ConceptRowState {
  const isCustom = !!cfg && !cfg.is_default
  return {
    concept,
    scoreThreshold: String(Math.round((cfg?.score_threshold ?? DEFAULTS.score_threshold) * 100)),
    consecutiveRequired: String(cfg?.consecutive_required ?? DEFAULTS.consecutive_required),
    requiredForCert: (cfg?.required_for_cert ?? DEFAULTS.required_for_cert) === 1,
    isCustom,
    saving: false,
    saved: false,
    error: '',
  }
}

export default function MasteryConfigPanel() {
  const [rows, setRows] = useState<ConceptRowState[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    assessmentApi.listMasteryConfigs().then(configs => {
      const cfgMap = new Map(configs.map(c => [c.concept, c]))
      setRows(OOP_CONCEPTS.map(c => toRow(c, cfgMap.get(c) ?? null)))
    }).finally(() => setLoading(false))
  }, [])

  function update(concept: string, patch: Partial<ConceptRowState>) {
    setRows(prev => prev.map(r => r.concept === concept ? { ...r, ...patch } : r))
  }

  async function handleSave(row: ConceptRowState) {
    const score = parseFloat(row.scoreThreshold) / 100
    const consecutive = parseInt(row.consecutiveRequired, 10)
    if (isNaN(score) || score < 0.5 || score > 1.0) {
      update(row.concept, { error: 'Score must be 50–100%' }); return
    }
    if (isNaN(consecutive) || consecutive < 1 || consecutive > 10) {
      update(row.concept, { error: 'Streak must be 1–10' }); return
    }
    update(row.concept, { saving: true, error: '' })
    try {
      await assessmentApi.saveMasteryConfig(row.concept, score, consecutive, row.requiredForCert)
      update(row.concept, { saving: false, saved: true, isCustom: true })
      setTimeout(() => update(row.concept, { saved: false }), 2000)
    } catch {
      update(row.concept, { saving: false, error: 'Save failed' })
    }
  }

  async function handleReset(concept: string) {
    try {
      await assessmentApi.resetMasteryConfig(concept)
      setRows(prev => prev.map(r => r.concept === concept ? toRow(concept, null) : r))
    } catch { /* ignore if no custom config */ }
  }

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        Configure mastery thresholds per concept. Changes apply to future exams only.
        Leave as default (80% / 3 in a row) unless you have a specific reason to change.
      </p>

      {rows.map(row => (
        <div
          key={row.concept}
          className="rounded-lg border p-4 space-y-3"
          style={{ borderColor: row.isCustom ? 'rgba(124,58,237,0.35)' : '#e5e7eb', backgroundColor: row.isCustom ? 'rgba(124,58,237,0.03)' : 'white' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-gray-900">{row.concept}</span>
              {row.isCustom && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'rgba(124,58,237,0.1)', color: '#3C3489' }}>
                  Custom
                </span>
              )}
            </div>
            {row.isCustom && (
              <button
                onClick={() => handleReset(row.concept)}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Reset to defaults
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Score threshold (%)</label>
              <input
                type="number"
                min={50} max={100}
                value={row.scoreThreshold}
                onChange={e => update(row.concept, { scoreThreshold: e.target.value })}
                className="w-20 px-2 py-1.5 text-sm border rounded-md text-gray-900 outline-none focus:ring-1"
                style={{ borderColor: '#d1d5db' }}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Consecutive correct</label>
              <input
                type="number"
                min={1} max={10}
                value={row.consecutiveRequired}
                onChange={e => update(row.concept, { consecutiveRequired: e.target.value })}
                className="w-20 px-2 py-1.5 text-sm border rounded-md text-gray-900 outline-none focus:ring-1"
                style={{ borderColor: '#d1d5db' }}
              />
            </div>
            <div className="flex items-center gap-2 pb-1">
              <input
                type="checkbox"
                id={`cert-${row.concept}`}
                checked={row.requiredForCert}
                onChange={e => update(row.concept, { requiredForCert: e.target.checked })}
                className="rounded"
              />
              <label htmlFor={`cert-${row.concept}`} className="text-xs text-gray-600">Required for cert</label>
            </div>
            <button
              onClick={() => handleSave(row)}
              disabled={row.saving}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-white transition-opacity disabled:opacity-60"
              style={{ backgroundColor: row.saved ? '#16a34a' : '#3C3489' }}
            >
              {row.saving ? 'Saving…' : row.saved ? '✓ Saved' : 'Save'}
            </button>
          </div>

          {row.error && <p className="text-xs text-red-500">{row.error}</p>}
        </div>
      ))}
    </div>
  )
}
