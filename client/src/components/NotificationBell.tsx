import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { api } from '@/lib/api'

interface Notification { id: string; type: string; title: string; body: string; readAt: string | null; createdAt: string }

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  function refresh() { api.get<{ notifications: Notification[] }>('/notifications').then((r) => setNotifications(r.notifications)) }
  useEffect(() => { refresh(); const interval = setInterval(refresh, 20000); return () => clearInterval(interval) }, [])
  const unreadCount = notifications.filter((n) => !n.readAt).length
  async function markRead(id: string) { await api.post(`/notifications/${id}/read`); setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n)) }
  return <div className="relative"><button onClick={() => setOpen((v) => !v)} aria-label="Open notifications" className="theme-toggle !w-10 !h-10 !min-h-0 !p-0 justify-center"><Bell size={16} />{unreadCount > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 rounded-full bg-punch text-[10px] flex items-center justify-center text-ink font-semibold px-1">{unreadCount > 9 ? '9+' : unreadCount}</span>}</button>{open && <><div className="fixed inset-0 z-40" onClick={() => setOpen(false)} /><div className="absolute right-0 top-12 w-72 max-h-96 overflow-y-auto rounded-2xl bg-surface border border-border shadow-xl z-50"><div className="p-4 border-b border-border"><p className="text-sm font-semibold">Notifications</p><p className="text-[11px] text-muted mt-1">The useful kind of ping.</p></div>{notifications.length === 0 ? <p className="text-xs text-muted text-center py-8 px-4">Nothing yet. We’ll ping you here.</p> : <div className="divide-y divide-border">{notifications.map((n) => <button key={n.id} onClick={() => markRead(n.id)} className={`w-full text-left p-4 hover:bg-surface-2 ${n.readAt ? 'opacity-60' : ''}`}><p className="text-xs font-semibold">{n.title}</p><p className="text-[11px] text-muted mt-1">{n.body}</p><p className="text-[10px] text-muted mt-2">{new Date(n.createdAt).toLocaleString()}</p></button>)}</div>}</div></>}</div>
}
