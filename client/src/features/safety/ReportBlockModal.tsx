import { useState } from 'react'
import { api } from '@/lib/api'

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'harassment', label: 'Harassment' },
  { id: 'no_show', label: 'No show' },
  { id: 'fake_profile', label: 'Fake profile' },
  { id: 'safety_concern', label: 'Safety concern' },
  { id: 'spam', label: 'Spam' },
  { id: 'other', label: 'Other' },
]

export function ReportBlockModal({ userId, groupId, onClose }: { userId: string; groupId?: string; onClose: () => void }) {
  const [category, setCategory] = useState<string | null>(null)
  const [details, setDetails] = useState('')
  const [alsoBlock, setAlsoBlock] = useState(true)
  const [done, setDone] = useState(false)

  async function submit() {
    if (!category) return
    await api.post('/reports', { reportedUserId: userId, groupId, category, details })
    if (alsoBlock) await api.post('/blocks', { blockedUserId: userId, reason: category })
    setDone(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="modal-sheet rounded-t-3xl bg-surface border-t border-border p-6">
        {done ? (
          <p className="text-center text-sm text-lime py-4">Thanks. Our team will look into it.</p>
        ) : (
          <>
            <h2 className="font-display text-lg font-semibold mb-4">Report</h2>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`rounded-xl border py-2.5 text-sm ${category === c.id ? 'border-punch bg-punch/10' : 'border-border bg-surface-2'}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Anything else we should know?"
              className="w-full rounded-xl bg-surface-2 border border-border p-3 text-sm outline-none mb-4"
              rows={3}
            />
            <label className="flex items-center gap-2 text-sm text-muted mb-6">
              <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} />
              Also block this person from future matching
            </label>
            <button onClick={submit} disabled={!category} className="w-full rounded-2xl bg-punch text-ink font-semibold py-4 disabled:opacity-40">
              Submit report
            </button>
          </>
        )}
        <button onClick={onClose} className="w-full text-center text-xs text-muted mt-4">
          Close
        </button>
      </div>
    </div>
  )
}
