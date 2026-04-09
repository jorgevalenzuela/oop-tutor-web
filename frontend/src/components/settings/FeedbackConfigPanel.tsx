import { useState, useEffect } from 'react'
import { assessmentApi, FeedbackConfig } from '@/services/assessmentApi'

export default function FeedbackConfigPanel() {
  const [config, setConfig] = useState<FeedbackConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    assessmentApi.getFeedbackConfig().then(setConfig).catch(() => {})
  }, [])

  async function handleSave() {
    if (!config) return
    setSaving(true)
    try {
      const updated = await assessmentApi.updateFeedbackConfig(
        config.tutor_feedback_enabled === 1,
        config.exam_feedback_enabled === 1,
        config.discussion_enabled === 1,
        config.notification_email
      )
      setConfig(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (!config) return <p className="text-sm text-gray-400">Loading…</p>

  function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
    return (
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-gray-700">{label}</span>
        <button
          onClick={() => onChange(!value)}
          className="relative w-10 h-5 rounded-full transition-colors"
          style={{ backgroundColor: value ? '#3C3489' : '#d1d5db' }}
        >
          <span
            className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
            style={{ transform: value ? 'translateX(20px)' : 'translateX(2px)' }}
          />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <Toggle
        label="Enable tutor response feedback"
        value={config.tutor_feedback_enabled === 1}
        onChange={v => setConfig({ ...config, tutor_feedback_enabled: v ? 1 : 0 })}
      />
      <Toggle
        label="Enable exam question flagging"
        value={config.exam_feedback_enabled === 1}
        onChange={v => setConfig({ ...config, exam_feedback_enabled: v ? 1 : 0 })}
      />
      <Toggle
        label="Enable discussion board"
        value={config.discussion_enabled === 1}
        onChange={v => setConfig({ ...config, discussion_enabled: v ? 1 : 0 })}
      />
      <div className="pt-2">
        <label className="block text-xs font-medium mb-1" style={{ color: '#6b5fa8' }}>
          Notification email (new discussion posts)
        </label>
        <input
          type="email"
          value={config.notification_email}
          onChange={e => setConfig({ ...config, notification_email: e.target.value })}
          placeholder="instructor@example.com"
          className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
          style={{ borderColor: '#AFA9EC', color: '#1e1635' }}
        />
        <p className="text-xs text-gray-400 mt-1">Leave blank to disable email notifications.</p>
      </div>
      <div className="pt-3 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-sm px-4 py-2 rounded-lg font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: '#3C3489' }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && <span className="text-xs text-green-600">Saved!</span>}
      </div>
    </div>
  )
}
