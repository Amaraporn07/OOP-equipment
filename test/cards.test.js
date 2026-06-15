import { test, expect } from "bun:test"

// Run server first: bun run dev
// Then in another terminal: bun test

const BASE = "http://localhost:3000"

test("GET /api/cards returns array", async () => {
  const res = await fetch(`${BASE}/api/cards`)
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(Array.isArray(data)).toBe(true)
  expect(data.length).toBeGreaterThan(0)
})

test("POST /api/cards creates a card in todo column", async () => {
  const res = await fetch(`${BASE}/api/cards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Test card" }),
  })
  expect(res.status).toBe(201)
  const card = await res.json()
  expect(card.title).toBe("Test card")
  expect(card.column).toBe("todo")
  expect(card.id).toBeDefined()
})

// ---------------------------------------------------------------
// LAB TARGET: this test FAILS until you implement the move endpoint
// ---------------------------------------------------------------
test("PATCH /api/cards/:id/move moves card to target column", async () => {
  const res = await fetch(`${BASE}/api/cards/3/move`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ column: "in-progress" }),
  })
  expect(res.status).toBe(200)
  const card = await res.json()
  expect(card.column).toBe("in-progress")
})
