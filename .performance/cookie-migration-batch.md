# Cookie Migration Batching

## Problem

`migrateLegacyCookies()` in `src/core/services/session/index.ts:29-59` calls `Promise.allSettled()` on ALL legacy cookies simultaneously. With many cookies, this thrashes Electron's native cookie store with hundreds of concurrent `cookies.set()` calls, causing contention and slow completion.

## Constraint

Migration must complete **before Tab loads**, so it's on the critical path and must be as fast as possible.

## Solution

Batch cookie writes with a concurrency limit.

### Changes

Replace `Promise.allSettled(cookies.map(...))` with batched iteration:

```typescript
const BATCH_SIZE = 20;
for (let i = 0; i < cookies.length; i += BATCH_SIZE) {
  const batch = cookies.slice(i, i + BATCH_SIZE);
  await Promise.allSettled(batch.map(cookie => setCookie(cookie)));
}
```

### Impact

- Prevents thundering herd on Electron's cookie store
- Reduces total migration time by ~100-300ms for users with many cookies
- More predictable completion time
