import { useEffect, useState } from 'react'
import './App.css'

type ColumnId = 'todo' | 'doing' | 'done'

type Card = {
  id: string
  text: string
  column: ColumnId
}

const COLUMNS: { id: ColumnId; title: string }[] = [
  { id: 'todo', title: '해야 함' },
  { id: 'doing', title: '진행 중' },
  { id: 'done', title: '완료' },
]

const STORAGE_KEY = 'kanban_cards_v1'

function loadCards(): Card[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Card[]) : []
  } catch {
    return []
  }
}

function App() {
  const [cards, setCards] = useState<Card[]>(loadCards)
  const [drafts, setDrafts] = useState<Record<ColumnId, string>>({
    todo: '',
    doing: '',
    done: '',
  })
  const [dragId, setDragId] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards))
  }, [cards])

  function addCard(column: ColumnId) {
    const text = drafts[column].trim()
    if (!text) return
    const id = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`
    setCards((prev) => [...prev, { id, text, column }])
    setDrafts((prev) => ({ ...prev, [column]: '' }))
  }

  function deleteCard(id: string) {
    setCards((prev) => prev.filter((c) => c.id !== id))
  }

  function moveCard(id: string, column: ColumnId) {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, column } : c)))
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>📋 칸반 보드</h1>
        <span className="count">카드 {cards.length}개</span>
      </header>

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
                <h2>{col.title}</h2>
                <span className="badge">{colCards.length}</span>
              </div>

              <div className="cards">
                {colCards.map((card) => (
                  <article
                    key={card.id}
                    className="card"
                    draggable
                    onDragStart={() => setDragId(card.id)}
                    onDragEnd={() => setDragId(null)}
                  >
                    <span className="card-text">{card.text}</span>
                    <button
                      className="del"
                      title="삭제"
                      onClick={() => deleteCard(card.id)}
                    >
                      ×
                    </button>
                  </article>
                ))}
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
    </div>
  )
}

export default App
