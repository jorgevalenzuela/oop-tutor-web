import { useState, useEffect, useCallback } from 'react'
import { assessmentApi, DiscussionPostWithMeta, DiscussionThread, FeedbackConfig } from '@/services/assessmentApi'
import { useAuth } from '@/contexts/AuthContext'
import { MessageSquare, CheckCircle, ChevronDown, ChevronUp, Plus, X } from 'lucide-react'
import { getAssessableNodes } from '@/data/oopHierarchy'

const CONCEPTS = getAssessableNodes().map(n => n.label)

// ─── New Post modal ───────────────────────────────────────────────────────────

function NewPostModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [concept, setConcept] = useState(CONCEPTS[0])
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!subject.trim() || !body.trim()) { setError('Subject and body are required'); return }
    setSubmitting(true)
    try {
      await assessmentApi.createDiscussionPost(concept, subject.trim(), body.trim())
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold" style={{ color: '#1e1635' }}>New Question</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#6b5fa8' }}>Concept</label>
            <select
              value={concept}
              onChange={e => setConcept(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
              style={{ borderColor: '#AFA9EC', color: '#1e1635' }}
            >
              {CONCEPTS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#6b5fa8' }}>Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Brief summary of your question"
              className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
              style={{ borderColor: '#AFA9EC', color: '#1e1635' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#6b5fa8' }}>Question</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Describe your question in detail…"
              rows={5}
              className="w-full text-sm px-3 py-2 rounded-lg border outline-none resize-none"
              style={{ borderColor: '#AFA9EC', color: '#1e1635' }}
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="px-6 pb-5 flex justify-end gap-3">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg" style={{ color: '#6b5fa8' }}>Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="text-sm px-5 py-2 rounded-lg font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: '#3C3489' }}
          >
            {submitting ? 'Posting…' : 'Post Question'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Thread panel ─────────────────────────────────────────────────────────────

function ThreadPanel({
  postId,
  onClose,
  onResolved,
}: {
  postId: string
  onClose: () => void
  onResolved: () => void
}) {
  const { user } = useAuth()
  const [thread, setThread] = useState<DiscussionThread | null>(null)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    assessmentApi.getDiscussionThread(postId).then(setThread).catch(console.error)
  }, [postId])

  async function handleReply() {
    if (!replyText.trim() || !thread) return
    setSubmitting(true)
    try {
      const reply = await assessmentApi.replyToPost(postId, replyText.trim())
      setThread({ ...thread, replies: [...thread.replies, reply] })
      setReplyText('')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResolve() {
    if (!thread) return
    await assessmentApi.resolvePost(postId)
    setThread({ ...thread, is_resolved: 1 })
    onResolved()
  }

  const isInstructor = user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN'

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex flex-col shadow-2xl overflow-y-auto"
      style={{ width: 420, backgroundColor: '#fafaf9', borderLeft: '1px solid #e5e7eb' }}>
      <div className="sticky top-0 z-10 bg-white flex items-center justify-between px-5 py-4 border-b">
        <p className="font-semibold text-gray-800 truncate pr-2">{thread?.subject ?? '…'}</p>
        <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
      </div>

      {!thread && (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Loading…</div>
      )}

      {thread && (
        <div className="flex-1 p-5 space-y-5">
          {/* Original post */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: 'rgba(60,52,137,0.1)', color: '#3C3489' }}>
                {thread.concept}
              </span>
              {thread.is_resolved === 1 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Resolved
                </span>
              )}
            </div>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{thread.body}</p>
            <p className="text-xs text-gray-400 mt-2">
              {thread.author_name} · {new Date(thread.created_at).toLocaleDateString()}
            </p>
          </div>

          {/* Replies */}
          {thread.replies.length > 0 && (
            <div className="space-y-3">
              {thread.replies.map(r => (
                <div key={r.id} className="rounded-xl border border-gray-100 p-4"
                  style={{ backgroundColor: r.author_id === thread.student_id ? '#faf9ff' : '#f0fdf4' }}>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{r.body}</p>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {r.author_name} · {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Reply input */}
          <div>
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Write a reply…"
              rows={3}
              className="w-full text-sm px-3 py-2 rounded-lg border outline-none resize-none"
              style={{ borderColor: '#AFA9EC', color: '#1e1635' }}
            />
            <div className="flex items-center justify-between mt-2">
              {isInstructor && thread.is_resolved === 0 && (
                <button
                  onClick={handleResolve}
                  className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-colors hover:bg-green-50"
                  style={{ borderColor: '#86efac', color: '#16a34a' }}
                >
                  <CheckCircle className="h-3.5 w-3.5" /> Mark Resolved
                </button>
              )}
              {(!isInstructor || thread.is_resolved !== 0) && <span />}
              <button
                onClick={handleReply}
                disabled={submitting || !replyText.trim()}
                className="text-sm px-4 py-1.5 rounded-lg font-medium text-white disabled:opacity-40"
                style={{ backgroundColor: '#3C3489' }}
              >
                {submitting ? '…' : 'Reply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Post row ─────────────────────────────────────────────────────────────────

function PostRow({ post, onClick }: { post: DiscussionPostWithMeta; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: 'rgba(60,52,137,0.1)', color: '#3C3489' }}>
              {post.concept}
            </span>
            {post.is_resolved === 1 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Resolved
              </span>
            )}
          </div>
          <p className="font-medium text-gray-800 truncate">{post.subject}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {post.author_name} · {new Date(post.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
          <MessageSquare className="h-3.5 w-3.5" />
          {post.reply_count}
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DiscussionPage() {
  const { user } = useAuth()
  const isStudent = user?.role === 'STUDENT'
  const isInstructor = user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN'

  const [config, setConfig] = useState<FeedbackConfig | null>(null)
  const [posts, setPosts] = useState<DiscussionPostWithMeta[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [conceptFilter, setConceptFilter] = useState('')
  const [resolvedFilter, setResolvedFilter] = useState<'all' | 'open' | 'resolved'>('all')
  const [loading, setLoading] = useState(true)
  const [showNewPost, setShowNewPost] = useState(false)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [showConceptFilter, setShowConceptFilter] = useState(false)

  const perPage = 20

  useEffect(() => {
    assessmentApi.getFeedbackConfig().then(setConfig).catch(() => {})
  }, [])

  const load = useCallback(async (p: number, concept: string, resolved: 'all' | 'open' | 'resolved') => {
    setLoading(true)
    try {
      const resolvedParam = resolved === 'all' ? undefined : resolved === 'resolved'
      const data = await assessmentApi.listDiscussion(p, concept || undefined, resolvedParam)
      setPosts(data.posts)
      setTotal(data.total)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(page, conceptFilter, resolvedFilter) }, [load, page, conceptFilter, resolvedFilter])

  if (config?.discussion_enabled === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-400">Discussion board is currently disabled.</p>
      </div>
    )
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="h-full overflow-y-auto" style={{ backgroundColor: '#f5f4ff' }}>
      <div className="max-w-3xl mx-auto px-5 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#1e1635' }}>Discussion</h1>
            <p className="text-sm text-gray-500 mt-0.5">{total} question{total !== 1 ? 's' : ''}</p>
          </div>
          {isStudent && (
            <button
              onClick={() => setShowNewPost(true)}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium text-white"
              style={{ backgroundColor: '#3C3489' }}
            >
              <Plus className="h-4 w-4" />
              New Question
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          {/* Resolved filter */}
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: '#AFA9EC' }}>
            {(['all', 'open', 'resolved'] as const).map(v => (
              <button
                key={v}
                onClick={() => { setResolvedFilter(v); setPage(1) }}
                className="text-xs px-3 py-1.5 transition-colors capitalize"
                style={{
                  backgroundColor: resolvedFilter === v ? '#3C3489' : 'white',
                  color: resolvedFilter === v ? 'white' : '#6b5fa8',
                }}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Concept filter */}
          <div className="relative">
            <button
              onClick={() => setShowConceptFilter(!showConceptFilter)}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-colors"
              style={{ borderColor: '#AFA9EC', color: conceptFilter ? '#3C3489' : '#6b5fa8', backgroundColor: conceptFilter ? 'rgba(60,52,137,0.08)' : 'white' }}
            >
              {conceptFilter || 'All concepts'}
              {showConceptFilter ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {showConceptFilter && (
              <div className="absolute top-full mt-1 left-0 z-20 bg-white border rounded-xl shadow-lg py-1 max-h-60 overflow-y-auto min-w-48"
                style={{ borderColor: '#e5e7eb' }}>
                <button
                  onClick={() => { setConceptFilter(''); setShowConceptFilter(false); setPage(1) }}
                  className="w-full text-left px-4 py-1.5 text-xs hover:bg-purple-50 transition-colors"
                  style={{ color: '#6b5fa8' }}
                >
                  All concepts
                </button>
                {CONCEPTS.map(c => (
                  <button
                    key={c}
                    onClick={() => { setConceptFilter(c); setShowConceptFilter(false); setPage(1) }}
                    className="w-full text-left px-4 py-1.5 text-xs hover:bg-purple-50 transition-colors"
                    style={{ color: c === conceptFilter ? '#3C3489' : '#1e1635', fontWeight: c === conceptFilter ? 600 : 400 }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {(conceptFilter || resolvedFilter !== 'all') && (
            <button
              onClick={() => { setConceptFilter(''); setResolvedFilter('all'); setPage(1) }}
              className="text-xs" style={{ color: '#9ca3af' }}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Post list */}
        {loading ? (
          <div className="text-sm text-gray-400 text-center py-10">Loading…</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">No questions yet.</p>
            {isStudent && (
              <button
                onClick={() => setShowNewPost(true)}
                className="mt-3 text-sm font-medium"
                style={{ color: '#3C3489' }}
              >
                Be the first to ask →
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map(p => (
              <PostRow key={p.id} post={p} onClick={() => setSelectedPostId(p.id)} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="text-xs px-3 py-1.5 rounded-lg border disabled:opacity-40"
              style={{ borderColor: '#AFA9EC', color: '#3C3489' }}
            >
              ← Prev
            </button>
            <span className="text-xs px-3 py-1.5 text-gray-500">
              {page} / {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="text-xs px-3 py-1.5 rounded-lg border disabled:opacity-40"
              style={{ borderColor: '#AFA9EC', color: '#3C3489' }}
            >
              Next →
            </button>
          </div>
        )}

        {/* Instructor note */}
        {isInstructor && (
          <p className="text-xs text-center text-gray-400 mt-4">
            You can reply to any post and mark posts as resolved.
          </p>
        )}
      </div>

      {/* Thread slide-in */}
      {selectedPostId && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSelectedPostId(null)} />
          <ThreadPanel
            postId={selectedPostId}
            onClose={() => setSelectedPostId(null)}
            onResolved={() => load(page, conceptFilter, resolvedFilter)}
          />
        </>
      )}

      {/* New post modal */}
      {showNewPost && (
        <NewPostModal
          onClose={() => setShowNewPost(false)}
          onCreated={() => load(1, conceptFilter, resolvedFilter)}
        />
      )}
    </div>
  )
}
