import { useEffect, useRef, useState } from 'react'
import { useParams, useLocation } from 'wouter'
import { api } from '@/lib/api'
import { connectRoomSocket, type WsMessage, type PollData } from '@/lib/ws'
import { useAuthStore } from '@/lib/store'
import { AvatarIcon } from '@/components/AvatarIcon'
import { ReportBlockModal } from '@/features/safety/ReportBlockModal'

interface GroupMember {
  id: string
  username: string
  avatarId: string
  avatarColor: string
  firstName?: string
  reliability: string
  arrivedAt: string | null
  isSelf: boolean
}

interface GroupDetail {
  group: { id: string; tableName: string; meetAt: string; chatRoomId: string; revealed: boolean; revealAt: string }
  venue?: { name: string; area: string }
  members: GroupMember[]
}

export default function ChatRoom() {
  const { groupId } = useParams()
  const [, navigate] = useLocation()
  const self = useAuthStore((s) => s.user)
  const [detail, setDetail] = useState<GroupDetail | null>(null)
  const [messages, setMessages] = useState<WsMessage[]>([])
  const [draft, setDraft] = useState('')
  const [blockedNotice, setBlockedNotice] = useState<string | null>(null)
  const [showSafety, setShowSafety] = useState(false)
  const [reportTarget, setReportTarget] = useState<GroupMember | null>(null)
  const [typingUserId, setTypingUserId] = useState<string | null>(null)
  const [reactMessageId, setReactMessageId] = useState<string | null>(null)
  const [showPollForm, setShowPollForm] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [readByMessageId, setReadByMessageId] = useState<Record<string, string>>({})
  const socketRef = useRef<ReturnType<typeof connectRoomSocket> | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!groupId) return
    api.get<GroupDetail>(`/groups/${groupId}`).then(async (d) => {
      setDetail(d)
      const history = await api.get<{ messages: WsMessage[] }>(`/chat/${d.group.chatRoomId}/messages`)
      setMessages(history.messages)
      socketRef.current = connectRoomSocket(d.group.chatRoomId, {
        onMessage: (m) => setMessages((prev) => (prev.some((existing) => existing.id === m.id) ? prev : [...prev, m])),
        onBlocked: (reason) => setBlockedNotice(reason),
        onReaction: (messageId, reactions) =>
          setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))),
        onPollUpdate: (messageId, poll) =>
          setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, poll } : m))),
        onRead: (userId, messageId) => {
          if (userId === self?.id) return
          setReadByMessageId((prev) => ({ ...prev, [userId]: messageId }))
        },
        onTyping: (userId) => {
          if (userId === self?.id) return
          setTypingUserId(userId)
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = setTimeout(() => setTypingUserId(null), 3000)
        },
      })
    })
    return () => socketRef.current?.close()
  }, [groupId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
    const last = messages[messages.length - 1]
    if (last && !last.isSystem) socketRef.current?.markRead(last.id)
  }, [messages])

  function send() {
    if (!draft.trim() || !socketRef.current) return
    socketRef.current.send(draft.trim())
    setDraft('')
  }

  async function arrive() {
    if (!groupId) return
    await api.post(`/groups/${groupId}/arrive`)
  }

  async function addToCircle(userId: string) {
    if (!groupId) return
    await api.post('/circle/add', { userId, groupId })
  }

  if (!detail) {
    return (
      <div className="app-shell flex items-center justify-center min-h-screen">
        <p className="text-muted text-sm">Loading table…</p>
      </div>
    )
  }

  const meetAtPast = new Date(detail.group.meetAt).getTime() < Date.now()

  return (
    <div className="app-shell flex flex-col min-h-screen">
      <header className="px-4 pt-5 pb-3 border-b border-border sticky top-0 bg-ink/95 backdrop-blur z-10">
        <button onClick={() => navigate('/plans')} className="text-xs text-muted mb-2">
          ← Plans
        </button>
        <h1 className="font-display text-lg font-semibold">{detail.group.tableName}</h1>
        <p className="text-xs text-muted">
          {new Date(detail.group.meetAt).toLocaleString()} · {detail.venue?.area}
        </p>
        <div className="flex items-center gap-2 mt-2">
          {detail.members.map((m) => (
            <button
              key={m.id}
              onClick={() => !m.isSelf && setReportTarget(m)}
              className="flex flex-col items-center"
            >
              <AvatarIcon avatarId={m.avatarId} color={m.avatarColor} size={28} />
              <span className="text-[9px] text-muted mt-0.5">{m.firstName ?? m.username}</span>
            </button>
          ))}
        </div>
        {!detail.group.revealed && (
          <p className="text-[11px] text-muted mt-2">Names unlock at {new Date(detail.group.revealAt).toLocaleTimeString()}</p>
        )}
        <div className="flex gap-2 mt-3">
          <button onClick={arrive} className="text-xs rounded-full bg-lime/20 text-lime px-3 py-1.5 border border-lime/40">
            I've arrived 📍
          </button>
          <button onClick={() => setShowSafety(true)} className="text-xs rounded-full bg-surface-2 px-3 py-1.5 border border-border">
            Safety check-in
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={m.isSystem ? 'text-center' : ''}>
            {m.isSystem ? (
              <p className="text-[11px] text-muted italic">{m.body}</p>
            ) : (
              <div className={`flex gap-2 ${m.sender?.id === self?.id ? 'flex-row-reverse' : ''}`}>
                {m.sender && <AvatarIcon avatarId={m.sender.avatarId} color={m.sender.avatarColor} size={24} />}
                <div className="max-w-[75%]">
                  {m.poll ? (
                    <PollBubble poll={m.poll} isSelf={m.sender?.id === self?.id} onVote={(optionId) => socketRef.current?.votePoll(m.id, optionId)} />
                  ) : (
                    <button
                      onDoubleClick={() => setReactMessageId(m.id)}
                      className={`block text-left rounded-2xl px-3 py-2 text-sm ${m.sender?.id === self?.id ? 'bg-lilac text-ink' : 'bg-surface-2'}`}
                    >
                      {m.sender?.id !== self?.id && (
                        <p className="text-[10px] text-muted mb-0.5">{m.sender?.firstName ?? m.sender?.username}</p>
                      )}
                      {m.body}
                    </button>
                  )}
                  {m.reactions && Object.keys(m.reactions).length > 0 && (
                    <div className={`flex gap-1 mt-1 flex-wrap ${m.sender?.id === self?.id ? 'justify-end' : ''}`}>
                      {Object.entries(m.reactions).map(([emoji, userIds]) => (
                        <button
                          key={emoji}
                          onClick={() => socketRef.current?.react(m.id, emoji)}
                          className="text-[11px] rounded-full bg-surface-2 border border-border px-1.5 py-0.5"
                        >
                          {emoji} {userIds.length}
                        </button>
                      ))}
                    </div>
                  )}
                  {reactMessageId === m.id && (
                    <div className="flex gap-1 mt-1">
                      {['😂', '❤️', '🔥', '👀', '😭'].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            socketRef.current?.react(m.id, emoji)
                            setReactMessageId(null)
                          }}
                          className="text-base"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {(() => {
          const lastOwn = [...messages].reverse().find((m) => !m.isSystem && m.sender?.id === self?.id)
          if (!lastOwn) return null
          const seenCount = Object.values(readByMessageId).filter((id) => id === lastOwn.id).length
          return seenCount > 0 ? (
            <p className="text-[10px] text-muted text-right">Seen by {seenCount}</p>
          ) : null
        })()}
        {typingUserId && <p className="text-[11px] text-muted italic">Someone's typing…</p>}
      </div>

      {blockedNotice && (
        <p className="px-4 py-2 text-xs text-punch bg-punch/10 border-t border-punch/30">{blockedNotice}</p>
      )}

      {meetAtPast && (
        <div className="px-4 py-2 flex gap-2 overflow-x-auto border-t border-border">
          {detail.members.filter((m) => !m.isSelf).map((m) => (
            <button
              key={m.id}
              onClick={() => addToCircle(m.id)}
              className="text-[11px] whitespace-nowrap rounded-full bg-surface-2 border border-border px-2.5 py-1"
            >
              + Add {m.firstName ?? m.username} to circle
            </button>
          ))}
        </div>
      )}

      {showActions && (
        <div className="px-4 pb-2 flex gap-2">
          <button
            onClick={() => { setShowPollForm(true); setShowActions(false) }}
            className="text-xs rounded-full bg-surface-2 border border-border px-3 py-1.5"
          >
            📊 Poll
          </button>
          <button
            onClick={() => { socketRef.current?.shareVenue(); setShowActions(false) }}
            className="text-xs rounded-full bg-surface-2 border border-border px-3 py-1.5"
          >
            📍 Share venue
          </button>
        </div>
      )}

      <div className="px-4 py-3 border-t border-border flex gap-2 items-center">
        <button
          onClick={() => setShowActions((v) => !v)}
          className="rounded-full bg-surface-2 border border-border w-9 h-9 flex items-center justify-center text-lg shrink-0"
        >
          +
        </button>
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            socketRef.current?.typing()
          }}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Say something… (double-tap a message to react)"
          className="flex-1 rounded-full bg-surface-2 border border-border px-4 py-2.5 text-sm outline-none"
        />
        <button onClick={send} className="rounded-full bg-lilac text-ink px-4 py-2.5 text-sm font-semibold">
          Send
        </button>
      </div>

      {showPollForm && (
        <PollForm
          onClose={() => setShowPollForm(false)}
          onCreate={(question, options) => {
            socketRef.current?.createPoll(question, options)
            setShowPollForm(false)
          }}
        />
      )}

      {showSafety && (
        <SafetySheet groupId={groupId!} onClose={() => setShowSafety(false)} />
      )}
      {reportTarget && (
        <ReportBlockModal
          userId={reportTarget.id}
          groupId={groupId!}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  )
}

function SafetySheet({ groupId, onClose }: { groupId: string; onClose: () => void }) {
  const [done, setDone] = useState<'safe' | 'need_help' | null>(null)

  async function checkin(status: 'safe' | 'need_help') {
    await api.post('/safety/checkin', { groupId, status })
    setDone(status)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-[480px] rounded-t-3xl bg-surface border-t border-border p-6">
        {!done ? (
          <>
            <h2 className="font-display text-lg font-semibold mb-1">All good?</h2>
            <p className="text-sm text-muted mb-6">Just checking in after your meetup.</p>
            <div className="flex gap-3">
              <button onClick={() => checkin('safe')} className="flex-1 rounded-2xl bg-lime text-ink font-semibold py-3.5">
                I'm safe
              </button>
              <button onClick={() => checkin('need_help')} className="flex-1 rounded-2xl bg-punch text-ink font-semibold py-3.5">
                Need help
              </button>
            </div>
          </>
        ) : done === 'need_help' ? (
          <div className="text-center">
            <p className="text-sm mb-2">We've alerted our safety team.</p>
            <p className="text-xs text-muted mb-4">In an emergency, call 112 directly.</p>
            <a href="tel:112" className="block rounded-2xl bg-punch text-ink font-semibold py-3.5 mb-2">
              Call 112
            </a>
          </div>
        ) : (
          <p className="text-center text-sm text-lime">Glad you're safe. See you next time 🫶</p>
        )}
        <button onClick={onClose} className="w-full text-center text-xs text-muted mt-4">
          Close
        </button>
      </div>
    </div>
  )
}

function PollBubble({ poll, isSelf, onVote }: { poll: PollData; isSelf: boolean; onVote: (optionId: string) => void }) {
  const totalVotes = poll.options.reduce((s, o) => s + o.votes.length, 0)
  return (
    <div className={`rounded-2xl px-3 py-3 text-sm ${isSelf ? 'bg-lilac text-ink' : 'bg-surface-2'}`}>
      <p className="font-medium mb-2">📊 {poll.question}</p>
      <div className="space-y-1.5">
        {poll.options.map((opt) => {
          const pct = totalVotes ? Math.round((opt.votes.length / totalVotes) * 100) : 0
          return (
            <button
              key={opt.id}
              onClick={() => onVote(opt.id)}
              className={`w-full text-left rounded-lg px-2.5 py-1.5 text-xs relative overflow-hidden ${isSelf ? 'bg-ink/10' : 'bg-surface'}`}
            >
              <div
                className={`absolute inset-y-0 left-0 ${isSelf ? 'bg-ink/10' : 'bg-lilac/20'}`}
                style={{ width: `${pct}%` }}
              />
              <span className="relative flex justify-between">
                <span>{opt.label}</span>
                <span>{opt.votes.length}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PollForm({ onClose, onCreate }: { onClose: () => void; onCreate: (question: string, options: string[]) => void }) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])

  function updateOption(i: number, value: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)))
  }

  function submit() {
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean)
    if (!question.trim() || cleanOptions.length < 2) return
    onCreate(question.trim(), cleanOptions)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-[480px] rounded-t-3xl bg-surface border-t border-border p-6">
        <h2 className="font-display text-lg font-semibold mb-4">New poll</h2>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask the table something"
          className="w-full rounded-xl bg-surface-2 border border-border px-4 py-3 text-sm outline-none mb-3"
        />
        <div className="space-y-2 mb-3">
          {options.map((opt, i) => (
            <input
              key={i}
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              className="w-full rounded-xl bg-surface-2 border border-border px-4 py-2.5 text-sm outline-none"
            />
          ))}
        </div>
        {options.length < 6 && (
          <button onClick={() => setOptions((prev) => [...prev, ''])} className="text-xs text-lilac mb-4">
            + Add option
          </button>
        )}
        <button onClick={submit} className="w-full rounded-2xl bg-lilac text-ink font-semibold py-3.5">
          Post poll
        </button>
        <button onClick={onClose} className="w-full text-center text-xs text-muted mt-4">
          Cancel
        </button>
      </div>
    </div>
  )
}
