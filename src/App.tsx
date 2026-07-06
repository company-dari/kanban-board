import { useEffect, useState } from 'react'
import './App.css'

type ColumnId = 'todo' | 'doing' | 'done'
type Urgency = 'high' | 'mid' | 'low'

type Card = {
  id: string
  title: string
  note: string
  category: string
  urgency: Urgency
  due: string // YYYY-MM-DD or ''
  column: ColumnId
}

type Daily = {
  id: string
  text: string
  lastDone: string // YYYY-MM-DD
}

const COLUMNS: { id: ColumnId; title: string }[] = [
  { id: 'todo', title: '해야 함' },
  { id: 'doing', title: '진행 중' },
  { id: 'done', title: '완료' },
]

const CATEGORIES: { name: string; color: string }[] = [
  { name: '마케팅', color: '#8b5cf6' },
  { name: '재무', color: '#16a34a' },
  { name: '거래처', color: '#f97316' },
  { name: '운영', color: '#3b82f6' },
  { name: '개인', color: '#9ca3af' },
]

const URGENCY: { id: Urgency; label: string; dot: string }[] = [
  { id: 'high', label: '긴급', dot: '#ef4444' },
  { id: 'mid', label: '보통', dot: '#f59e0b' },
  { id: 'low', label: '여유', dot: '#22c55e' },
]

const CARDS_KEY = 'kanban_cards_v2'
const DAILY_KEY = 'kanban_daily_v1'

function todayStr(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function catColor(name: string): string {
  return CATEGORIES.find((c) => c.name === name)?.color ?? '#64748b'
}

function urgencyDot(u: Urgency): string {
  return URGENCY.find((x) => x.id === u)?.dot ?? '#64748b'
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function newId(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}

function App() {
  const [cards, setCards] = useState<Card[]>(() => load<Card[]>(CARDS_KEY, []))
  const [dailies, setDailies] = useState<Daily[]>(() =>
    load<Daily[]>(DAILY_KEY, []),
  )
  const [drafts, setDrafts] = useState<Record<ColumnId, string>>({
    todo: '',
    doing: '',
    done: '',
  })
  const [dailyDraft, setDailyDraft] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem(CARDS_KEY, JSON.stringify(cards))
  }, [cards])
  useEffect(() => {
    localStorage.setItem(DAILY_KEY, JSON.stringify(dailies))
  }, [dailies])

  const today = todayStr()

  function addCard(column: ColumnId) {
    const title = drafts[column].trim()
    if (!title) return
    setCards((prev) => [
      ...prev,
      {
        id: newId(),
        title,
        note: '',
        category: '',
        urgency: 'mid',
        due: '',
        column,
      },
    ])
    setDrafts((prev) => ({ ...prev, [column]: '' }))
  }

  function updateCard(id: string, patch: Partial<Card>) {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  function deleteCard(id: string) {
    setCards((prev) => prev.filter((c) => c.id !== id))
    setEditId((cur) => (cur === id ? null : cur))
  }

  function moveCard(id: string, column: ColumnId) {
    updateCard(id, { column })
  }

  function addDaily() {
    const text = dailyDraft.trim()
    if (!text) return
    setDailies((prev) => [...prev, { id: newId(), text, lastDone: '' }])
    setDailyDraft('')
  }

  function toggleDaily(id: string) {
    setDailies((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, lastDone: d.lastDone === today ? '' : today }
          : d,
      ),
    )
  }

  function deleteDaily(id: string) {
    setDailies((prev) => prev.filter((d) => d.id !== id))
  }

  const editing = cards.find((c) => c.id === editId) ?? null
  const doneToday = dailies.filter((d) => d.lastDone === today).length

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <h1>
            <span className="logo">📋</span> 칸반 보드
          </h1>
          <p className="sub">주제 · 시급성 · 완료일 · 메모로 관리하는 업무 보드</p>
        </div>
        <span className="count">{cards.length} cards</span>
      </header>

      {/* 매일 체크 */}
      <section className="daily">
        <div className="daily-head">
          <h2>🔁 매일 체크</h2>
          <span className="badge">
            {doneToday}/{dailies.length}
          </span>
        </div>
        <div className="daily-items">
          {dailies.map((d) => {
            const done = d.lastDone === today
            return (
              <label key={d.id} className={`daily-item${done ? ' done' : ''}`}>
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => toggleDaily(d.id)}
                />
                <span>{d.text}</span>
                <button
                  className="del"
                  title="삭제"
                  onClick={(e) => {
                    e.preventDefault()
                    deleteDaily(d.id)
                  }}
                >
                  ×
                </button>
              </label>
            )
          })}
        </div>
        <div className="add">
          <input
            value={dailyDraft}
            placeholder="+ 매일 할 일 추가"
            onChange={(e) => setDailyDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addDaily()
            }}
          />
        </div>
      </section>

      {/* 보드 */}
      <div className="board">
        {COLUMNS.map((col) => {
          const colCards = cards.filter((c) => c.column === col.id)
          return (
            <section
              key={col.id}
              className="column"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragId) moveCard(dragId, col.id)
                setDragId(null)
              }}
            >
              <div className="column-head">
                <span className={`col-dot ${col.id}`} />
                <h2>{col.title}</h2>
                <span className="badge">{colCards.length}</span>
              </div>

              <div className="cards">
                {colCards.length === 0 && (
                  <div className="empty">여기로 카드를 끌어오세요</div>
                )}
                {colCards.map((card) => {
                  const overdue =
                    card.due && card.due < today && card.column !== 'done'
                  return (
                    <article
                      key={card.id}
                      className={`card${dragId === card.id ? ' dragging' : ''}`}
                      draggable
                      style={{
                        borderLeftColor: card.category
                          ? catColor(card.category)
                          : urgencyDot(card.urgency),
                      }}
                      onDragStart={() => setDragId(card.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => setEditId(card.id)}
                    >
                      <div className="card-top">
                        <span
                          className="urg-dot"
                          style={{ background: urgencyDot(card.urgency) }}
                          title={
                            URGENCY.find((u) => u.id === card.urgency)?.label
                          }
                        />
                        {card.category && (
                          <span
                            className="cat-tag"
                            style={{ background: catColor(card.category) }}
                          >
                            {card.category}
                          </span>
                        )}
                        {card.urgency === 'high' && (
                          <span className="bang">❗</span>
                        )}
                        <button
                          className="del"
                          title="삭제"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteCard(card.id)
                          }}
                        >
                          ×
                        </button>
                      </div>
                      <div className="card-title">{card.title}</div>
                      {card.note && <div className="card-note">{card.note}</div>}
                      {card.due && (
                        <div className={`due${overdue ? ' overdue' : ''}`}>
                          📅 {card.due}
                          {overdue ? ' · 지남' : ''}
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>

              <div className="add">
                <input
                  value={drafts[col.id]}
                  placeholder="+ 카드 추가"
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [col.id]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addCard(col.id)
                  }}
                />
              </div>
            </section>
          )
        })}
      </div>

      {/* 편집 모달 */}
      {editing && (
        <div className="modal-back" onClick={() => setEditId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <label className="field">
              <span>주제</span>
              <input
                value={editing.title}
                onChange={(e) =>
                  updateCard(editing.id, { title: e.target.value })
                }
              />
            </label>

            <label className="field">
              <span>카테고리</span>
              <select
                value={editing.category}
                onChange={(e) =>
                  updateCard(editing.id, { category: e.target.value })
                }
              >
                <option value="">없음</option>
                {CATEGORIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>시급성</span>
              <div className="urg-pick">
                {URGENCY.map((u) => (
                  <button
                    key={u.id}
                    className={`urg-btn${
                      editing.urgency === u.id ? ' active' : ''
                    }`}
                    style={{ borderColor: u.dot }}
                    onClick={() => updateCard(editing.id, { urgency: u.id })}
                  >
                    <span
                      className="urg-dot"
                      style={{ background: u.dot }}
                    />
                    {u.label}
                  </button>
                ))}
              </div>
            </label>

            <label className="field">
              <span>완료 예정일</span>
              <input
                type="date"
                value={editing.due}
                onChange={(e) =>
                  updateCard(editing.id, { due: e.target.value })
                }
              />
            </label>

            <label className="field">
              <span>메모</span>
              <textarea
                rows={4}
                value={editing.note}
                placeholder="자세한 내용, 체크리스트 등"
                onChange={(e) =>
                  updateCard(editing.id, { note: e.target.value })
                }
              />
            </label>

            <div className="modal-actions">
              <button
                className="btn-danger"
                onClick={() => deleteCard(editing.id)}
              >
                삭제
              </button>
              <button className="btn-primary" onClick={() => setEditId(null)}>
                완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
