import { useState, useEffect, useCallback } from 'react'
import { assessmentApi, StudentRow, StudentDetail, AnalyticsReport } from '@/services/assessmentApi'
import { useAuth } from '@/contexts/AuthContext'
import { ChevronUp, ChevronDown, Search, X, Download, Award } from 'lucide-react'

// ─── Analytics cards ──────────────────────────────────────────────────────────

function AnalyticsCards({ report }: { report: AnalyticsReport }) {
  const certRate = report.total_students === 0
    ? 0
    : Math.round((report.students_with_cert / report.total_students) * 100)

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
      {[
        { label: 'Students', value: report.total_students },
        { label: 'Avg Mastery', value: `${report.avg_mastery_pct}%` },
        { label: 'Cert Rate', value: `${certRate}%` },
        { label: 'Completed Exams', value: report.total_exams },
      ].map(({ label, value }) => (
        <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
          <p className="text-2xl font-bold" style={{ color: '#3C3489' }}>{value}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Concept stats ────────────────────────────────────────────────────────────

function ConceptStatsList({ report }: { report: AnalyticsReport }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-3">Hardest Concepts</p>
        {report.hardest_concepts.length === 0
          ? <p className="text-sm text-gray-400">No data yet</p>
          : report.hardest_concepts.map(c => (
            <div key={c.concept} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-700 truncate pr-2">{c.concept}</span>
              <span className="text-sm font-medium text-red-500 shrink-0">
                {Math.round(c.avg_score * 100)}%
              </span>
            </div>
          ))
        }
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-3">Easiest Concepts</p>
        {report.easiest_concepts.length === 0
          ? <p className="text-sm text-gray-400">No data yet</p>
          : report.easiest_concepts.map(c => (
            <div key={c.concept} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-700 truncate pr-2">{c.concept}</span>
              <span className="text-sm font-medium text-green-600 shrink-0">
                {Math.round(c.avg_score * 100)}%
              </span>
            </div>
          ))
        }
      </div>
    </div>
  )
}

// ─── Student table ────────────────────────────────────────────────────────────

type SortKey = 'email' | 'mastery' | 'exams' | 'last_exam'

const CERT_BADGE: Record<StudentRow['cert_status'], { label: string; cls: string }> = {
  issued: { label: 'Issued', cls: 'bg-green-100 text-green-700' },
  revoked: { label: 'Revoked', cls: 'bg-red-100 text-red-600' },
  none: { label: 'None', cls: 'bg-gray-100 text-gray-500' },
}

function StudentTable({
  students,
  sort,
  onSort,
  onSelect,
}: {
  students: StudentRow[]
  sort: SortKey
  onSort: (k: SortKey) => void
  onSelect: (s: StudentRow) => void
}) {
  function SortBtn({ col, label }: { col: SortKey; label: string }) {
    const active = sort === col
    return (
      <button
        onClick={() => onSort(col)}
        className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide hover:text-purple-700 transition-colors"
        style={{ color: active ? '#3C3489' : '#9ca3af' }}
      >
        {label}
        {active ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3 opacity-30" />}
      </button>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-3"><SortBtn col="email" label="Student" /></th>
            <th className="text-left px-4 py-3"><SortBtn col="mastery" label="Mastery" /></th>
            <th className="text-left px-4 py-3"><SortBtn col="exams" label="Exams" /></th>
            <th className="text-left px-4 py-3"><SortBtn col="last_exam" label="Last Exam" /></th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Cert</th>
          </tr>
        </thead>
        <tbody>
          {students.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center py-8 text-gray-400 text-sm">No students found</td>
            </tr>
          )}
          {students.map(s => {
            const badge = CERT_BADGE[s.cert_status]
            const name = s.display_name ?? s.email
            return (
              <tr
                key={s.id}
                onClick={() => onSelect(s)}
                className="border-b border-gray-50 last:border-0 hover:bg-purple-50/40 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{name}</p>
                  {s.display_name && <p className="text-xs text-gray-400">{s.email}</p>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${s.mastery_pct}%`, backgroundColor: '#3C3489' }}
                      />
                    </div>
                    <span className="text-gray-700">{s.mastery_pct}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{s.exam_count}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {s.last_exam_at ? new Date(s.last_exam_at.replace(' ', 'T') + 'Z').toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>
                    {badge.label}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Student detail panel ─────────────────────────────────────────────────────

function StudentDetailPanel({
  studentId,
  onClose,
}: {
  studentId: string
  onClose: () => void
}) {
  const [detail, setDetail] = useState<StudentDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    assessmentApi.getStudentDetail(studentId)
      .then(setDetail)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [studentId])

  const mastered = detail?.mastery.filter(m => m.mastery_achieved).length ?? 0

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 flex flex-col shadow-2xl overflow-y-auto"
      style={{ width: 380, backgroundColor: '#fafaf9', borderLeft: '1px solid #e5e7eb' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
        <p className="font-semibold text-gray-800 truncate pr-2">
          {detail?.display_name ?? detail?.email ?? '…'}
        </p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
      )}

      {!loading && detail && (
        <div className="p-5 space-y-5">
          {/* Overview */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Mastery', value: `${mastered}/28` },
              { label: 'Exams', value: detail.exams.length },
              { label: 'Certificate', value: CERT_BADGE[detail.cert_status].label },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 text-center">
                <p className="text-xs text-gray-400">{label}</p>
                <p className="font-bold text-sm mt-0.5" style={{ color: '#3C3489' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Certificate */}
          {detail.certificate && (
            <div className="bg-green-50 border border-green-100 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Award className="h-4 w-4 text-green-600" />
                <p className="text-sm font-semibold text-green-700">Certificate Issued</p>
              </div>
              <p className="text-xs text-green-600">
                {new Date(detail.certificate.issued_at).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })}
              </p>
              <p className="text-xs text-gray-500 mt-1 font-mono break-all">
                {detail.certificate.verification_code}
              </p>
            </div>
          )}

          {/* Concept mastery */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Concept Mastery</p>
            <div className="space-y-1.5">
              {detail.mastery.map(m => (
                <div key={m.concept} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: m.mastery_achieved ? '#16a34a' : m.total_attempts > 0 ? '#ca8a04' : '#d1d5db' }}
                  />
                  <span className="text-xs text-gray-700 flex-1 truncate">{m.concept}</span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {m.total_attempts > 0 ? `${Math.round(m.average_score * 100)}%` : '—'}
                  </span>
                </div>
              ))}
              {detail.mastery.length === 0 && (
                <p className="text-xs text-gray-400">No attempts yet</p>
              )}
            </div>
          </div>

          {/* Recent exams */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Exams</p>
            {detail.exams.length === 0
              ? <p className="text-xs text-gray-400">No exams yet</p>
              : detail.exams.slice(0, 5).map(e => (
                <div key={e.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-500">
                    {new Date(e.started_at.replace(' ', 'T') + 'Z').toLocaleDateString()}
                  </span>
                  <span className="text-xs text-gray-400">{e.status}</span>
                  <span className="text-xs font-medium" style={{ color: '#3C3489' }}>
                    {e.overall_score !== null ? `${Math.round(e.overall_score * 100)}%` : '—'}
                  </span>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InstructorDashboard() {
  const { user } = useAuth()
  const isTA = user?.role === 'TA'

  const [analytics, setAnalytics] = useState<AnalyticsReport | null>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [sort, setSort] = useState<SortKey>('email')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (s: SortKey, q: string) => {
    setLoading(true)
    try {
      const [ana, studs] = await Promise.all([
        assessmentApi.getAnalytics(),
        assessmentApi.listStudents(s, q || undefined),
      ])
      setAnalytics(ana)
      setStudents(studs)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(sort, search) }, [load, sort, search])

  function handleSort(k: SortKey) {
    setSort(k)
  }

  function handleExport() {
    const url = assessmentApi.exportCsvUrl()
    const a = document.createElement('a')
    a.href = url
    a.download = 'students.csv'
    // attach auth token as query param not supported by backend — open in new tab instead
    window.open(url, '_blank')
  }

  return (
    <div className="h-full overflow-y-auto" style={{ backgroundColor: '#f5f4ff' }}>
      <div className="max-w-5xl mx-auto px-5 py-6">

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#1e1635' }}>Instructor Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isTA ? 'TA view — read-only' : 'Class overview and student progress'}
            </p>
          </div>
          {!isTA && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border transition-colors hover:bg-purple-50"
              style={{ borderColor: '#AFA9EC', color: '#3C3489' }}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          )}
        </div>

        {/* Analytics */}
        {analytics && <AnalyticsCards report={analytics} />}
        {analytics && <ConceptStatsList report={analytics} />}

        {/* Search + table */}
        <div className="mb-3 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search students…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border outline-none"
              style={{ borderColor: '#AFA9EC', backgroundColor: 'white', color: '#1e1635' }}
            />
          </div>
          {loading && <span className="text-xs text-gray-400">Loading…</span>}
        </div>

        <StudentTable
          students={students}
          sort={sort}
          onSort={handleSort}
          onSelect={s => setSelectedId(s.id)}
        />
      </div>

      {/* Detail slide-in */}
      {selectedId && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setSelectedId(null)}
          />
          <StudentDetailPanel
            studentId={selectedId}
            onClose={() => setSelectedId(null)}
          />
        </>
      )}
    </div>
  )
}
