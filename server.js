import express from "express"

const app = express()
const PORT = 3000

app.use(express.json())
app.use(express.static("public"))

// --- In-memory store ---
let nextId = 6
const cards = [
  { id: 1, title: "Set up project",     column: "done"        },
  { id: 2, title: "Write API tests",    column: "in-progress" },
  { id: 3, title: "Add dark mode",      column: "todo"        },
  { id: 4, title: "Fix login bug",      column: "todo"        },
  { id: 5, title: "Deploy to staging",  column: "todo"        },
]

// GET /api/cards
app.get("/api/cards", (req, res) => {
  res.json(cards)
})

// POST /api/cards  { title, column? }
app.post("/api/cards", (req, res) => {
  const { title, column = "todo" } = req.body
  if (!title) return res.status(400).json({ error: "title required" })
  const card = { id: nextId++, title, column }
  cards.push(card)
  res.status(201).json(card)
})

// DELETE /api/cards/:id
app.delete("/api/cards/:id", (req, res) => {
  const id = parseInt(req.params.id)
  const idx = cards.findIndex(c => c.id === id)
  if (idx === -1) return res.status(404).json({ error: "not found" })
  cards.splice(idx, 1)
  res.status(204).send()
})

// PATCH /api/cards/:id/move  <-- NOT IMPLEMENTED (TDD lab target)
// Students implement this in the S2 lab:
//   body: { column: "todo" | "in-progress" | "done" }
//   returns: updated card (200) or 404 if id not found

app.listen(PORT, () => {
  console.log(`Kanban running at http://localhost:${PORT}`)
})
