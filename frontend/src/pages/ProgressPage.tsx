import { useEffect, useState } from 'react'
import { assessmentApi, ProgressReport, ConceptMastery, Certificate, CertEligibility } from '../services/assessmentApi'
import { OOP_HIERARCHY, HierarchyNode } from '../data/oopHierarchy'

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function MasteryCircle({ pct }: { pct: number }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="70" cy="70" r={r} fill="none" strokeWidth="10" stroke="rgba(60,52,137,0.12)" />
        <circle
          cx="70" cy="70" r={r} fill="none" strokeWidth="10"
          stroke={pct >= 80 ? '#16a34a' : pct >= 40 ? '#ca8a04' : '#3C3489'}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-bold" style={{ color: '#1e1635' }}>{pct}%</div>
        <div className="text-xs" style={{ color: '#6b5fa8' }}>mastery</div>
      </div>
    </div>
  )
}

// ─── Hierarchy tree ───────────────────────────────────────────────────────────

const ASSESSABLE_TYPES = new Set(['concept', 'category'])

interface TreeNodeProps {
  node: HierarchyNode
  depth: number
  masteryMap: Map<string, ConceptMastery>
  defaultExpanded: boolean
}

function MasteryBar({ record }: { record: ConceptMastery }) {
  const pct = Math.round(record.average_score * 100)
  const mastered = record.mastery_achieved === 1
  const barColor = mastered ? '#16a34a' : pct >= 50 ? '#ca8a04' : pct > 0 ? '#dc2626' : 'rgba(60,52,137,0.2)'
  const textColor = mastered ? '#15803d' : pct >= 50 ? '#92400e' : pct > 0 ? '#b91c1c' : '#9ca3af'

  return (
    <div className="flex items-center gap-2 ml-2">
      <div className="w-20 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgba(60,52,137,0.1)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
      <span className="text-xs w-7 text-right flex-shrink-0 font-medium" style={{ color: textColor }}>
        {pct > 0 ? `${pct}%` : '—'}
      </span>
      {mastered && <span className="text-xs" style={{ color: '#ca8a04' }}>★</span>}
    </div>
  )
}

function TreeNode({ node, depth, masteryMap, defaultExpanded }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const isAssessable = ASSESSABLE_TYPES.has(node.type)
  const hasChildren = node.children.length > 0
  const record = isAssessable ? masteryMap.get(node.label) : undefined

  // Indent: root children start at 0, each level adds 16px
  const indent = depth * 16

  // Label color based on mastery state
  let labelColor = '#1e1635'
  if (record) {
    if (record.mastery_achieved === 1) labelColor = '#15803d'
    else if (record.average_score >= 0.5) labelColor = '#92400e'
    else if (record.average_score > 0) labelColor = '#b91c1c'
  }

  // Node type visual weight
  const fontWeight = node.type === 'category' ? '600' : node.type === 'concept' ? '500' : '400'
  const fontSize = node.type === 'category' ? '0.8125rem' : '0.8rem'

  return (
    <div>
      <div
        className="flex items-center gap-1 py-1 rounded-md pr-2"
        style={{ paddingLeft: `${indent + 4}px` }}
      >
        {/* Expand/collapse toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 transition-colors"
          style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
            {expanded
              ? <path d="M0 2 L4 6 L8 2" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              : <path d="M2 0 L6 4 L2 8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            }
          </svg>
        </button>

        {/* Label */}
        <span
          className="flex-1 truncate"
          style={{ color: labelColor, fontWeight, fontSize }}
        >
          {node.label}
        </span>

        {/* Mastery bar — only for assessable nodes */}
        {isAssessable && record && <MasteryBar record={record} />}
        {isAssessable && !record && (
          <div className="flex items-center gap-2 ml-2">
            <div className="w-20 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgba(60,52,137,0.08)' }} />
            <span className="text-xs w-7 text-right flex-shrink-0" style={{ color: '#d1d5db' }}>—</span>
          </div>
        )}
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              masteryMap={masteryMap}
              defaultExpanded={false}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Certificate section ──────────────────────────────────────────────────────

function CertificateSection() {
  const [cert, setCert] = useState<Certificate | null | undefined>(undefined)
  const [eligibility, setEligibility] = useState<CertEligibility | null>(null)
  const [generating, setGenerating] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      assessmentApi.getMyCertificate(),
      assessmentApi.getCertEligibility(),
    ]).then(([c, e]) => {
      setCert(c)
      setEligibility(e)
    }).catch(() => setCert(null))
  }, [])

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    try {
      const newCert = await assessmentApi.generateCertificate()
      setCert(newCert)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate certificate')
    } finally {
      setGenerating(false)
    }
  }

  async function handleDownload() {
    setDownloading(true)
    try {
      await assessmentApi.downloadCertificate()
    } catch {
      setError('Download failed')
    } finally {
      setDownloading(false)
    }
  }

  if (cert === undefined || !eligibility) {
    return <p className="text-sm" style={{ color: '#6b5fa8' }}>Loading certificate status…</p>
  }

  const verifyUrl = cert
    ? `http://localhost:3002/api/certificates/verify/${cert.verification_code}`
    : null

  return (
    <div>
      <h3 className="text-sm font-medium mb-3" style={{ color: '#6b5fa8' }}>Certificate</h3>

      {/* Already has a certificate */}
      {cert && !cert.is_revoked && (
        <div className="rounded-xl p-5 space-y-4"
          style={{ backgroundColor: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.25)' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-base" style={{ color: '#15803d' }}>
                🎓 Certificate of Completion
              </p>
              <p className="text-sm mt-0.5" style={{ color: '#6b5fa8' }}>
                {cert.course_name} · Issued {new Date(cert.issued_at.replace(' ', 'T') + 'Z').toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              <p className="text-xs mt-1 font-medium" style={{ color: '#1e1635' }}>{cert.student_name}</p>
            </div>
          </div>

          <div className="rounded-lg px-3 py-2 text-xs font-mono break-all"
            style={{ backgroundColor: 'rgba(60,52,137,0.06)', color: '#3C3489', border: '1px solid rgba(60,52,137,0.15)' }}>
            {cert.verification_code}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: '#3C3489' }}
            >
              {downloading ? 'Downloading…' : 'Download PDF'}
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(verifyUrl!)}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: 'rgba(60,52,137,0.08)', color: '#3C3489', border: '1px solid rgba(60,52,137,0.2)' }}
            >
              Copy Verify Link
            </button>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}

      {/* Revoked */}
      {cert && cert.is_revoked === 1 && (
        <div className="rounded-xl p-4"
          style={{ backgroundColor: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
          <p className="text-sm font-medium" style={{ color: '#b91c1c' }}>Certificate revoked</p>
          <p className="text-xs mt-1" style={{ color: '#6b5fa8' }}>Contact your instructor for details.</p>
        </div>
      )}

      {/* Not yet certified */}
      {!cert && (
        <div className="rounded-xl p-5 space-y-4"
          style={{ border: '1px solid rgba(60,52,137,0.15)', backgroundColor: 'rgba(60,52,137,0.03)' }}>

          {eligibility.eligible ? (
            <div className="rounded-lg p-4"
              style={{ backgroundColor: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.25)' }}>
              <p className="font-semibold" style={{ color: '#15803d' }}>Congratulations! 🎉</p>
              <p className="text-sm mt-1" style={{ color: '#6b5fa8' }}>
                You have mastered all {eligibility.conceptsRequired} required concepts. Generate your certificate below.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: '#1e1635' }}>
                  {eligibility.conceptsMastered} / {eligibility.conceptsRequired} concepts mastered
                </span>
                <span className="text-xs" style={{ color: '#6b5fa8' }}>
                  {eligibility.conceptsRequired - eligibility.conceptsMastered} remaining
                </span>
              </div>
              <div className="h-2 rounded-full mb-4" style={{ backgroundColor: 'rgba(60,52,137,0.12)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.round(eligibility.conceptsMastered / eligibility.conceptsRequired * 100)}%`, backgroundColor: '#3C3489' }} />
              </div>
              {eligibility.remainingConcepts.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: '#b91c1c' }}>Still need mastery in:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {eligibility.remainingConcepts.map(c => (
                      <span key={c} className="px-2 py-0.5 rounded-full text-xs"
                        style={{ backgroundColor: 'rgba(220,38,38,0.08)', color: '#b91c1c', border: '1px solid rgba(220,38,38,0.2)' }}>
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div title={eligibility.eligible ? undefined : 'Complete mastery of all required concepts to unlock'}>
            <button
              onClick={handleGenerate}
              disabled={!eligibility.eligible || generating}
              className="w-full py-3 rounded-lg text-sm font-medium text-white disabled:opacity-40 transition-opacity"
              style={{ backgroundColor: '#16a34a' }}
            >
              {generating ? 'Generating…' : 'Generate Certificate'}
            </button>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProgressPage() {
  const [report, setReport] = useState<ProgressReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    assessmentApi.getProgress()
      .then(setReport)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load progress'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm" style={{ color: '#6b5fa8' }}>Loading progress…</p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-red-600">{error || 'No data'}</p>
      </div>
    )
  }

  const totalAttempted = report.concepts_mastered.length + report.concepts_close.length + report.concepts_struggling.length

  // Build label → mastery record lookup
  const masteryMap = new Map<string, ConceptMastery>([
    ...report.concepts_mastered.map(c => [c.concept, c] as [string, ConceptMastery]),
    ...report.concepts_close.map(c => [c.concept, c] as [string, ConceptMastery]),
    ...report.concepts_struggling.map(c => [c.concept, c] as [string, ConceptMastery]),
  ])

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* ── Section 1: Overall mastery ────────────────────────────────── */}
        <div>
          <h2 className="text-lg font-semibold mb-5" style={{ color: '#1e1635' }}>Your Progress</h2>
          <div className="flex flex-col sm:flex-row items-center gap-8"
            style={{ backgroundColor: 'rgba(60,52,137,0.05)', border: '1px solid rgba(60,52,137,0.12)', borderRadius: '0.75rem', padding: '1.5rem' }}>
            <MasteryCircle pct={report.overall_mastery_pct} />
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-semibold text-base" style={{ color: '#1e1635' }}>
                  {report.concepts_mastered.length} of {totalAttempted} concepts mastered
                </span>
              </div>
              <div className="space-y-1.5" style={{ color: '#6b5fa8' }}>
                <div className="flex gap-2">
                  <span className="w-28">Exams taken</span>
                  <span className="font-medium" style={{ color: '#1e1635' }}>{report.exam_count}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-28">Best score</span>
                  <span className="font-medium" style={{ color: '#1e1635' }}>
                    {report.best_score != null ? `${Math.round(report.best_score * 100)}%` : '—'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="w-28">Time spent</span>
                  <span className="font-medium" style={{ color: '#1e1635' }}>{formatTime(report.total_time_seconds)}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-28">Last exam</span>
                  <span className="font-medium" style={{ color: '#1e1635' }}>{formatDate(report.last_attempt_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 2: Hierarchy tree ─────────────────────────────────── */}
        <div>
          <h3 className="text-sm font-medium mb-3" style={{ color: '#6b5fa8' }}>Concept Breakdown</h3>
          <div className="rounded-xl py-2" style={{ border: '1px solid rgba(60,52,137,0.12)' }}>

            {/* Root label — always visible, not collapsible */}
            <div className="flex items-center gap-1 px-3 py-1.5">
              <span className="w-4 flex-shrink-0" />
              <span className="text-sm font-bold" style={{ color: '#2C2570' }}>OOP</span>
            </div>

            {/* Top-level categories — expanded by default */}
            {OOP_HIERARCHY.children.map(child => (
              <TreeNode
                key={child.id}
                node={child}
                depth={1}
                masteryMap={masteryMap}
                defaultExpanded={true}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-3 px-1">
            {[
              { color: '#15803d', label: 'Mastered' },
              { color: '#92400e', label: 'In Progress' },
              { color: '#b91c1c', label: 'Needs Work' },
              { color: '#9ca3af', label: 'Not attempted' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs" style={{ color }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {totalAttempted === 0 && (
          <div className="text-center py-8" style={{ color: '#6b5fa8' }}>
            <p className="text-sm">Take your first exam to start tracking progress.</p>
          </div>
        )}

        {/* ── Section 3: Certificate ────────────────────────────────────── */}
        <CertificateSection />

      </div>
    </div>
  )
}
