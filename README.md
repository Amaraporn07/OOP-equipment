# kanban-starter

Bun + Express Kanban board. Three-column in-memory API with a vanilla HTML frontend.

Used as the lab project for the "From Vibe Coding to Agentic Engineering" workshop (SE@ICTUP Know How Story, University of Phayao, June 15-16, 2026).

## Setup

```bash
bun install
bun run dev
```

Open http://localhost:3000 — you should see a three-column board (Todo / In Progress / Done).

## API

| Method | Route | Description |
|:--|:--|:--|
| GET | `/api/cards` | List all cards |
| POST | `/api/cards` | Create a card (`{ "title": "..." }`) |
| DELETE | `/api/cards/:id` | Delete a card |
| PATCH | `/api/cards/:id/move` | Move card to column — **not implemented yet** |

The `PATCH /api/cards/:id/move` endpoint is intentionally missing. It is the TDD lab target for Session 2.

## Tests

```bash
bun test
```

Expected result: 2 pass, 1 fail. The failing test targets the missing `PATCH /move` endpoint.

## Workshop Lab Deliverables

By the end of Session 1 (Monday 17:00):
- `GEMINI.md` created from `graphify-out/GRAPH_REPORT.md` and committed
- `skills/kanban-review/SKILL.md` authored and committed
- Git checkpoint committed

By the end of Session 2 (Tuesday 12:00):
- `PATCH /api/cards/:id/move` implemented (all 3 tests pass)
- Failing test turned green and committed
