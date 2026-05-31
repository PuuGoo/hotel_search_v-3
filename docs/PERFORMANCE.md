# Performance Plan — Hotel Search

Status: living document. Owner: engineering. Last updated: 2026-05-30.

This plan inventories the app's current performance characteristics, the known
bottlenecks, and a prioritized roadmap of improvements. It is grounded in the
actual architecture: Next.js 13 (App Router), MongoDB via Prisma, NextAuth (JWT
sessions), Pusher for realtime chat, external search engines (Tavily/Google/DDG),
and a Python + Playwright "URL finder" spawned as a child process.

---

## 1. Current state (what is already optimized)

These are in place today and should be preserved:

- **Parallel DB reads.** Dashboard, conversations layout, admin pages, and the
  search-history endpoint use `Promise.all` to collapse independent queries into
  a single round-trip instead of serial awaits.
- **Selective field projection.** The dashboard reads only the scalar columns it
  renders (no `include: { results: true }` join), avoiding overfetch.
- **Compound indexes.** `Conversation(lastMessageAt)`, `Message(conversationId, createdAt)`,
  `Search(userId, createdAt)`, `Bookmark(userId, createdAt)`, `SearchHistory(userId, createdAt)`,
  `AuditLog(createdAt)` back the common filter+sort access patterns.
- **Search caching + resilience.** Tavily has key rotation, a circuit breaker,
  and an LRU cache; Google/DDG results are cached. Rate limiting is per-user/IP.
- **Background writes.** The search route persists history/results in a
  non-blocking IIFE so the response isn't delayed by the DB write.
- **Auth without per-request DB hits for role/permissions.** Role + feature
  permissions ride in the JWT, so middleware and UI gating don't query the DB on
  every navigation. (Trade-off noted in section 3.)
- **Image hints.** `next/image` uses `sizes` on `fill` avatars/thumbnails to
  avoid serving oversized variants.

---

## 2. Measurement first (do this before optimizing)

We should not optimize blind. Establish baselines:

1. **Bundle analysis.** Add `@next/bundle-analyzer` and capture per-route JS
   size. Target: keep first-load JS for auth and chat routes lean; the chat
   thread route is currently the heaviest.
2. **Web Vitals.** Capture LCP/CLS/INP via the `web-vitals` library or Vercel
   Analytics on the search, chat, and dashboard pages.
3. **DB query timing.** Enable Prisma query logging in a staging environment and
   record p50/p95 for the hottest queries (conversation list, message fetch,
   search history, admin user list).
4. **API latency.** Log server-timing for `/api/search`, `/api/messages`,
   `/api/hotel-finder/*`. The search route already records `duration`.

Exit criteria for this phase: a one-page baseline table (route, JS size, LCP,
key query p95) committed alongside this doc.

---

## 3. Known bottlenecks and risks

### 3.1 In-memory state is per-process (scaling ceiling)
The search cache, rate limiter, Tavily circuit breaker, and the hotel-finder
job store are all in-process module state. This is fine for a single Node
process but breaks correctness the moment we run more than one instance
(PM2 cluster, multiple droplets, autoscaling):
- Rate limits become per-process (a user gets N× the intended quota).
- Cache hit rate drops (each process has a cold cache).
- Job progress (SSE) only works if the polling request lands on the process
  that owns the job.

**Plan:** move shared state to Redis (rate limit counters, search cache,
circuit-breaker state) and either pin finder jobs to a worker or move job state
to Redis/DB. Until then, document that the app must run as a **single instance**.

### 3.2 `getCurrentUser()` still hits the DB on API routes
Role/permissions are in the JWT, but `getCurrentUser()` does a
`prisma.user.findUnique` on every authenticated API call. For hot endpoints
(messages, seen) this is an extra round-trip.

**Plan:** for endpoints that only need `id`/`role`/`permissions`, read the JWT
via `getToken()` instead of loading the full user. Keep the DB read only where
the full record is genuinely needed.

### 3.3 Chat thread route weight
The `[conversationId]` route pulls the most client JS (drawer, modals, pusher
client). 

**Plan:** lazy-load the image modal, chat drawer, and confirm modal with
`next/dynamic` so they aren't in the initial chunk.

### 3.4 Hotel finder child process
Each finder job spawns Python + Playwright (Chromium), which is RAM-heavy. The
job store caps concurrency, but a burst still risks OOM on a small droplet.

**Plan:** keep the concurrency cap conservative, surface queue position (already
done), and document a minimum 2 GB RAM + swap. Consider a dedicated worker.

### 3.5 Pusher fan-out on message send
`/api/messages` triggers a per-recipient `UPDATE_CONVERSATION` event in a loop.
For large groups this is N serial triggers.

**Plan:** batch with `triggerBatch`, and broadcast the conversation update on a
single conversation channel where possible.

---

## 4. Roadmap (prioritized)

### P0 — correctness + cheap wins (this iteration)
- [ ] Document single-instance constraint in the deploy guide.
- [ ] Add bundle analyzer + capture baseline numbers.
- [ ] `next/dynamic` for chat modals/drawer.
- [ ] Replace `getCurrentUser()` with `getToken()` in role-only API checks
      (`requireAdmin`, `requireFeature`) to drop a DB hit per request.

### P1 — scale readiness
- [ ] Redis-backed rate limiter and search cache (shared across instances).
- [ ] Redis-backed circuit-breaker state.
- [ ] `triggerBatch` for Pusher message fan-out.
- [ ] Pagination defaults audited (admin users 20/page, search history clamp
      1–100 — keep; add cursor pagination for messages).

### P2 — deeper
- [ ] Move finder job state out of process; dedicated finder worker.
- [ ] Cursor-based message pagination + virtualized message list for long
      threads.
- [ ] Edge-cache static/marketing responses; add `Cache-Control` to safe GETs.
- [ ] Consider React Server Components for read-only lists to cut client JS.

---

## 5. Guardrails (don't regress)

- Every new `findMany` on a filtered+sorted path must be backed by an index.
- No new per-request full-user DB reads where the JWT already has the data.
- New realtime fan-out must batch.
- New client routes: check first-load JS before merging; lazy-load modals.
- Keep background/non-blocking writes off the response path.

---

## 6. Tracking

| Metric | Baseline | Target | Status |
|---|---|---|---|
| Search route p95 | TBD | < 1.5s (cache miss) | not measured |
| Chat route first-load JS | TBD | < 250 KB | not measured |
| Conversation list query p95 | TBD | < 50 ms | not measured |
| Multi-instance safe | No | Yes | blocked on Redis |

Fill the baseline column once section 2 is done; revisit this table each
iteration.
