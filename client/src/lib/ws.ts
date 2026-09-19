export interface PollData {
  question: string
  options: { id: string; label: string; votes: string[] }[]
}

export interface WsMessage {
  id: string
  body: string
  isSystem: boolean
  createdAt: string
  reactions?: Record<string, string[]>
  poll?: PollData | null
  sender: { id: string; username: string; avatarId: string; avatarColor: string; firstName?: string } | null
}

interface RoomSocketHandlers {
  onMessage: (m: WsMessage) => void
  onBlocked: (reason: string) => void
  onReaction?: (messageId: string, reactions: Record<string, string[]>) => void
  onTyping?: (userId: string) => void
  onPollUpdate?: (messageId: string, poll: PollData) => void
  onRead?: (userId: string, messageId: string) => void
}

export function connectRoomSocket(roomId: string, handlers: RoomSocketHandlers) {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const ws = new WebSocket(`${proto}://${window.location.host}/ws`)
  let closed = false
  const queue: string[] = []

  function flush() {
    while (queue.length && ws.readyState === WebSocket.OPEN) {
      ws.send(queue.shift()!)
    }
  }

  function sendOrQueue(payload: unknown) {
    const data = JSON.stringify(payload)
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data)
    } else if (!closed) {
      queue.push(data)
    }
  }

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'join', roomId }))
    flush()
  }

  ws.onmessage = (evt) => {
    const data = JSON.parse(evt.data)
    if (data.type === 'message') handlers.onMessage(data.message)
    if (data.type === 'blocked') handlers.onBlocked(data.reason)
    if (data.type === 'reaction') handlers.onReaction?.(data.messageId, data.reactions)
    if (data.type === 'typing') handlers.onTyping?.(data.userId)
    if (data.type === 'poll_update') handlers.onPollUpdate?.(data.messageId, data.poll)
    if (data.type === 'read') handlers.onRead?.(data.userId, data.messageId)
  }

  return {
    send(body: string) {
      sendOrQueue({ type: 'message', body })
    },
    react(messageId: string, emoji: string) {
      sendOrQueue({ type: 'reaction', messageId, emoji })
    },
    typing() {
      sendOrQueue({ type: 'typing' })
    },
    createPoll(question: string, options: string[]) {
      sendOrQueue({ type: 'poll_create', question, options })
    },
    votePoll(messageId: string, optionId: string) {
      sendOrQueue({ type: 'poll_vote', messageId, optionId })
    },
    shareVenue() {
      sendOrQueue({ type: 'share_venue' })
    },
    markRead(messageId: string) {
      sendOrQueue({ type: 'read', messageId })
    },
    close() {
      closed = true
      ws.close()
    },
  }
}
