# React and frontend: what to know first

**Written:** 2026-11-25 · **For:** Software Engineer and Senior Software Engineer interviews · **Source:** [React and JavaScript frontend guide](react-js-frontend-interview-guide.md) (the React folder has a guide, not numbered lessons)

This page is a short map of the long guide. The guide is big, so this page tells you which parts to read first, and gives you the sentence to say out loud. The number in brackets, like (2.4), is the section in the guide.

**How to read the stars.** This is my judgement of how often each topic is asked.

- ★★★ Asked in almost every React interview. Learn these first.
- ★★ Often asked, especially in senior rounds.
- ★ Asked for depth, or in frontend system design rounds.

## ★★★ Learn these first

| Topic | Say this in the interview | Common trap |
|---|---|---|
| Event loop (1.3) | One macrotask runs, then all microtasks drain, then the browser may paint. Long tasks (over 50 ms) block paint and hurt INP. | Know the order: sync code, microtasks, then timers. |
| Closures and stale closures (1.2, 2.4) | A hook closes over the values of one render. An effect with missing dependencies reads old values. | Fix with the right dependency list or `setCount(c => c + 1)`. |
| `useEffect` (2.6) | It syncs with outside systems and runs after paint. Cleanup runs before the next run and on unmount. | Three mistakes: derived state in effects, unstable object or function dependencies, and no cleanup for fetch (use AbortController). |
| Keys (2.3) | Keys are identity across renders, like name tags, not seat numbers. | An index as the key breaks on delete: input values attach to the wrong rows. |
| Reconciliation and Virtual DOM (2.1, 2.2) | The Virtual DOM is not "fast". It is a strategy: diff two JS trees, then apply the smallest batch of real DOM changes. | Do not say "the Virtual DOM is faster than the DOM". |
| `useMemo`, `useCallback`, `memo` (2.10) | Measure first. Memoizing costs memory and comparisons. The React Compiler 1.0 (Oct 2025) now does it at build time. | One unstable prop defeats `memo`. |
| State management (2.8, 3.7) | Split server state from client state first. Server state goes to React Query or SWR. Small client state goes to Zustand or Context. | Context re-renders every consumer. Redux is not the default any more. |
| Server Components (2.11) | Server components run only on the server, can read the database directly and ship zero JavaScript. `"use client"` marks a boundary, keep it at the leaves. | They add complexity and tie you to a framework. |

## ★★ Learn these second

| Topic | Say this in the interview |
|---|---|
| Promises and async/await (1.5) | Await pauses the function, not the thread. Avoid awaiting in sequence when calls are independent: use `Promise.all`. |
| Debounce vs throttle (1.6) | Debounce runs after events stop (live search, about 300 ms, plus AbortController). Throttle runs at most once per interval (scroll). |
| `useState` vs `useReducer` (2.5) | `useReducer` for many fields that change together, in one testable function. |
| Controlled vs uncontrolled (2.7) | Controlled means React state is the source of truth. Uncontrolled plus FormData is simpler and faster for plain submits. |
| Custom `useFetch` hook (2.9) | Three states (loading, error, data), check `res.ok`, and abort in cleanup. Then say React Query adds caching and retries. |
| Core Web Vitals (3.3) | LCP at most 2.5 s, INP at most 200 ms (INP replaced FID in March 2024), CLS at most 0.1, measured at the 75th percentile of real users. |
| Rendering strategies | CSR, SSR, ISR, RSC. Pick per page type, not per app. That sentence is the senior answer. |
| "What happens when you type a URL?" (1.8) | DNS, TCP, TLS, HTTP, then DOM, layout, paint. Map each stage to TTFB, LCP, INP. See the [networking summary](../networking/must-know-summary.md). |

## ★ Frontend system design

| Topic | Say this in the interview |
|---|---|
| Render 10,000 items (3.1) | Virtualization: render only the visible window in a tall spacer. |
| Infinite scroll (3.2) | An IntersectionObserver sentinel, keyset pagination (not OFFSET), virtualization, `useInfiniteQuery`. |
| Caching layers (3.5) | Hashed assets, CDN, stale-while-revalidate (React Query `staleTime`), then deliberate client storage. |
| localStorage vs cookies (3.6) | Default for auth is an HttpOnly, Secure, SameSite cookie. Think XSS versus CSRF. |
| Real time updates (3.10) | Pick the least powerful transport that works (polling, SSE, WebSocket). Then batch updates and virtualize. |
| Frontend for millions of users (3.9) | Edge and CDN first, ship less JavaScript, rendering per page type, layered caches, error boundaries and skeletons. |

For the full frontend design round, see [system design lesson 31](../system-design/31-the-frontend-design-round.md).

## The 6 questions most likely to come up

1. "Explain the event loop. What does this print?" (1.3)
2. "What is a closure? What is the stale closure bug?" (1.2, 2.4)
3. "How does React decide what to re-render? Why do keys matter?" (2.2, 2.3)
4. "When would you use `useMemo`? What does the compiler change?" (2.10)
5. "Redux, Context or Zustand?" Start with "is it server state?". (3.7)
6. "Server Components: what do they give you and what do they cost?" (2.11)

## Practice

- [React hooks and fetching workbook](react-hooks-fetching-practice.md) for hands-on code.
- The [visual cheat sheet](react-js-frontend-interview-guide-cheatsheet.html) is a good last read.
- For the JavaScript side, use the [JavaScript summary](../javascript/must-know-summary.md).

## Honest notes

- This page compresses the guide's own TL;DR and question list. Version facts (React 19.2, Compiler 1.0, Next.js 16, INP thresholds) were written into the guide in 2025 and 2026. Check them again before an interview if they matter for the role.
- The guide has no numbered lessons or quizzes yet, so there is no quiz for React in the browser.
