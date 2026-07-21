# React Hooks & Fetching — Hands-On Practice Workbook

- **Written:** 2026-07-09
- **Purpose:** relearn the basics by writing the code yourself, not just reading about it. Each exercise has a task, a step-by-step checklist, and a hidden answer — try first, then check.
- **How to use this:** paste each exercise into a quick sandbox — [codesandbox.io](https://codesandbox.io) or [stackblitz.com](https://stackblitz.com) for the React ones, [snack.expo.dev](https://snack.expo.dev) for the React Native one (Exercise 10). No local project setup needed.
- **Related reading:** [react-js-frontend-interview-guide.md](react-js-frontend-interview-guide.md) (concepts explained), [react-native-interview-guide.md](react-native-interview-guide.md) (mobile-specific delta).

## Before you start: the one gotcha that trips everyone

You cannot make the function passed to `useEffect` itself `async`:

```jsx
// ❌ Wrong — useEffect's callback must return nothing or a cleanup function,
// never a Promise. React will warn you about this.
useEffect(async () => {
  const res = await fetch(url);
}, []);

// ✅ Right — define an async function INSIDE the effect, then call it.
useEffect(() => {
  async function load() {
    const res = await fetch(url);
  }
  load();
}, []);
```

Every exercise below uses the second pattern. Remember it now so you don't rediscover this the hard way in Exercise 2.

---

## Exercise 1: useState warm-up

**Goal:** shake off the rust before touching fetch.

**Task:** build a `Counter` component with a count, a `+1` button, a `-1` button, and a `Reset` button.

**Steps to follow:**
1. Create state with `useState(0)`.
2. Write three click handlers that update it.
3. Render the current count and the three buttons.

Try it yourself first.

<details>
<summary>✅ Show Answer</summary>

```jsx
import { useState } from "react";

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
      <button onClick={() => setCount(count - 1)}>-1</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  );
}
```

**Why this works:** `useState(0)` gives you a piece of state (`count`) and a setter (`setCount`). Calling the setter tells React "re-render this component with the new value." Nothing fetches yet — this is just to warm up the muscle memory.

</details>

---

## Exercise 2: Fetch data on mount

**Goal:** the classic loading → data pattern, the foundation for everything after this.

**Task:** build a `UserList` component that fetches `https://jsonplaceholder.typicode.com/users` when it mounts, shows "Loading..." while waiting, then renders the names as a list.

**Steps to follow:**
1. Create state for `users` (starts as `[]`) and `loading` (starts as `true`).
2. Use `useEffect` with an **empty dependency array** `[]` — this means "run once, right after the first render."
3. Inside the effect, define an `async function load()` (remember the gotcha above), call `fetch`, `await` the JSON, then set state.
4. Call `load()` at the end of the effect.
5. Render "Loading..." while `loading` is true, otherwise render the list.

Try it yourself first.

<details>
<summary>✅ Show Answer</summary>

```jsx
import { useState, useEffect } from "react";

function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("https://jsonplaceholder.typicode.com/users");
      const data = await res.json();
      setUsers(data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

**Why this works:** the empty `[]` dependency array is what makes this run exactly once — if you forget it, the effect runs after *every* render, and since `setUsers` triggers a render, you'd get an infinite fetch loop. `key={user.id}` matters too — React uses it to track which list item is which across re-renders; using the array index instead would break if the list ever gets reordered or filtered.

</details>

---

## Exercise 3: Handle errors properly

**Goal:** fetch doesn't fail the way you'd expect — learn the gotcha.

**Task:** extend Exercise 2 so that if the request fails, you show an error message instead of crashing or showing a stale loading spinner forever.

**Steps to follow:**
1. Add an `error` state, starting as `null`.
2. Wrap the fetch in `try / catch / finally`.
3. **Important gotcha:** `fetch()` only rejects on a *network* failure (no internet, DNS failure). A 404 or 500 response is still a "successful" fetch as far as the Promise is concerned — you must check `res.ok` yourself and `throw` if it's false.
4. Put `setLoading(false)` in the `finally` block, so it always runs whether the fetch succeeded or failed.
5. Render the error message if `error` is set.

Try it yourself first.

<details>
<summary>✅ Show Answer</summary>

```jsx
function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("https://jsonplaceholder.typicode.com/users");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

**Why this works:** the `if (!res.ok) throw` line is the single most-forgotten line in fetch code — without it, a 404 page's HTML gets silently parsed as if it were valid JSON, and your error handling never triggers. `finally` guarantees `setLoading(false)` runs on both the success and failure paths, so you never get stuck showing a spinner forever.

</details>

---

## Exercise 4: Cancel the request on cleanup (AbortController)

**Goal:** stop a slow, stale response from overwriting a newer one — a real bug that happens in production apps.

**The scenario:** imagine `UserList` re-fetches whenever a `filter` prop changes. If a user changes the filter twice quickly, the *first* (slow) request might finish *after* the second (fast) one — and silently overwrite your correct, newer data with old, wrong data. This is the same race-condition family as duplicate webhook processing — just on the frontend instead of the backend.

**Steps to follow:**
1. Create an `AbortController` at the top of the effect: `const controller = new AbortController()`.
2. Pass `{ signal: controller.signal }` as the second argument to `fetch`.
3. In the `catch` block, ignore the error if `err.name === "AbortError"` — that's not a real failure, it's just you cancelling on purpose.
4. Return a cleanup function from the effect: `return () => controller.abort();` — React calls this automatically before the effect re-runs, or when the component unmounts.

Try it yourself first.

<details>
<summary>✅ Show Answer</summary>

```jsx
useEffect(() => {
  const controller = new AbortController();

  async function load() {
    try {
      const res = await fetch("https://jsonplaceholder.typicode.com/users", {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  load();
  return () => controller.abort();
}, []);
```

**Why this works:** the cleanup function is React's built-in "before you run this effect again, clean up after the last run" hook. Aborting the old request means its response, when it eventually arrives, gets thrown away instead of overwriting your state — the exact fix for the race condition described above.

</details>

---

## Exercise 5: Refetch when a prop changes

**Goal:** combine everything so far, with a **dependency array that isn't empty**.

**Task:** build `UserProfile({ userId })` that fetches `/users/:userId` and re-fetches automatically whenever the `userId` prop changes (e.g. the user clicks a different profile).

**Steps to follow:**
1. Same shape as Exercise 4, but the URL now uses `userId`.
2. Put `[userId]` in the dependency array instead of `[]`.
3. Think through what happens if `userId` changes twice quickly — walk through why the abort-on-cleanup from Exercise 4 matters *here specifically*.

Try it yourself first.

<details>
<summary>✅ Show Answer</summary>

```jsx
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    async function load() {
      try {
        const res = await fetch(
          `https://jsonplaceholder.typicode.com/users/${userId}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        setUser(data);
      } catch (err) {
        if (err.name !== "AbortError") console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [userId]);

  if (loading) return <p>Loading...</p>;
  return <p>{user?.name}</p>;
}
```

**Why this works:** whenever `userId` changes, React runs the cleanup from the *previous* effect (aborting the in-flight request for the old `userId`) before running the *new* effect. Without the abort, clicking through profiles quickly could show the wrong user's data for a moment — or permanently, if the old request happens to finish last.

</details>

---

## Exercise 6: Extract a reusable `useFetch` custom hook

**Goal:** stop copy-pasting this pattern into every component.

**Task:** turn the logic from Exercises 2-4 into a hook `useFetch(url)` that any component can call, returning `{ data, loading, error }`.

**Steps to follow:**
1. Move the three `useState` calls and the `useEffect` into a function named `useFetch(url)`.
2. Replace the hardcoded URL with the `url` parameter, and add `url` to the dependency array — so calling `useFetch` with a different URL automatically refetches.
3. `return { data, loading, error };` at the end.
4. Rewrite `UserList` to just call `const { data: users, loading, error } = useFetch(url)`.

Try it yourself first.

<details>
<summary>✅ Show Answer</summary>

```jsx
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        if (err.name !== "AbortError") setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [url]);

  return { data, loading, error };
}

// Usage — notice how thin the component becomes:
function UserList() {
  const { data: users, loading, error } = useFetch(
    "https://jsonplaceholder.typicode.com/users"
  );

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;
  return (
    <ul>
      {users.map((u) => (
        <li key={u.id}>{u.name}</li>
      ))}
    </ul>
  );
}
```

**Why this works:** a custom hook is just a normal function that starts with `use` and calls other hooks inside it. There's no new mechanism here — you're just packaging the same `useState`+`useEffect` pattern so every component that needs "fetch a URL" doesn't have to rewrite loading/error/cleanup logic from scratch.

</details>

---

## Exercise 7: Refactor to `useReducer`

**Goal:** understand *why* `useReducer` exists, not just its syntax.

**The problem with Exercise 6:** `data`, `loading`, and `error` are three separate `useState` calls, but they always change **together** in specific combinations (e.g. "loading" always means data is null and error is null). Nothing stops a bug from setting them into an inconsistent combination — like `loading: true` and `data: [...]` at the same time.

**Task:** rewrite `useFetch`'s internals to use one `useReducer` instead of three `useState` calls, so the three values change atomically as a single state object.

**Steps to follow:**
1. Write a `fetchReducer(state, action)` function with three cases: `"START"`, `"SUCCESS"`, `"ERROR"` — each one returns a **complete** new state object (all three fields), never a partial update.
2. Replace the three `useState` calls with one `useReducer(fetchReducer, { data: null, loading: true, error: null })`.
3. Replace each `setX(...)` call with a `dispatch({ type: ..., payload: ... })` call.
4. Return `state` directly from the hook (it already has `{ data, loading, error }` shape).

Try it yourself first.

<details>
<summary>✅ Show Answer</summary>

```jsx
function fetchReducer(state, action) {
  switch (action.type) {
    case "START":
      return { data: null, loading: true, error: null };
    case "SUCCESS":
      return { data: action.payload, loading: false, error: null };
    case "ERROR":
      return { data: null, loading: false, error: action.payload };
    default:
      return state;
  }
}

function useFetch(url) {
  const [state, dispatch] = useReducer(fetchReducer, {
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    dispatch({ type: "START" });

    async function load() {
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        dispatch({ type: "SUCCESS", payload: json });
      } catch (err) {
        if (err.name !== "AbortError") {
          dispatch({ type: "ERROR", payload: err.message });
        }
      }
    }

    load();
    return () => controller.abort();
  }, [url]);

  return state;
}
```

**Why this works:** each reducer case returns the *entire* new state in one atomic step — it's structurally impossible to end up with `loading: true` and `data` populated at the same time, because every case explicitly sets all three fields together. This is the real answer to "when do I reach for `useReducer` instead of `useState`": when several pieces of state always change **together** as one unit.

</details>

---

## Exercise 8: Debounced search box

**Goal:** combine fetch with a timer — the classic "don't fetch on every keystroke" pattern.

**Task:** build a search input that fetches results **500ms after the user stops typing**, not on every keystroke.

**Steps to follow:**
1. Write a small hook `useDebouncedValue(value, delay)`: it holds its own state, and uses `useEffect` with a `setTimeout` to update that state after `delay` ms — with a cleanup that calls `clearTimeout`, so if `value` changes again before the delay finishes, the old timer is cancelled.
2. In your search component, keep the raw input in one state (`query`), and pass it through `useDebouncedValue` to get a `debouncedQuery`.
3. Call `useFetch` (from Exercise 6) with a URL built from `debouncedQuery` — only the *debounced* value, never the raw `query`.

Try it yourself first.

<details>
<summary>✅ Show Answer</summary>

```jsx
function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function SearchUsers() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 500);

  const { data: users, loading } = useFetch(
    `https://jsonplaceholder.typicode.com/users?name_like=${debouncedQuery}`
  );

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search users..."
      />
      {loading && <p>Searching...</p>}
      <ul>{users?.map((u) => <li key={u.id}>{u.name}</li>)}</ul>
    </div>
  );
}
```

**Why this works:** every keystroke updates `query` immediately (so the input feels responsive), but `useDebouncedValue`'s cleanup cancels the pending timer on every new keystroke — so `debouncedQuery` (and therefore the fetch) only updates once the user actually pauses for 500ms.

**Stretch challenge (no answer given — try it yourself):** right now, `useFetch` will fire once immediately with an empty `debouncedQuery` before the user types anything, hitting the API with a useless empty search. Modify `useFetch` so it skips fetching entirely when `url` is falsy (e.g. `null` or `""`). Hint: guard the top of the effect with an early `return`.

</details>

---

## Exercise 9: `useCallback` — when a stable function reference actually matters

**Goal:** see the actual bug `useCallback` prevents, not just memorize its signature.

**The problem:** in the broken version below, `Parent` re-creates `fetchSomething` as a brand-new function on *every* render. `Child`'s effect depends on `onFetch`, so it thinks the function "changed" every time — and reruns the effect every single render, even though nothing meaningful actually changed.

```jsx
// ❌ Broken: fetchSomething is a new function reference on every render
function Parent() {
  const [count, setCount] = useState(0);

  function fetchSomething() {
    console.log("fetching...");
  }

  return (
    <>
      <button onClick={() => setCount(count + 1)}>Re-render parent</button>
      <Child onFetch={fetchSomething} />
    </>
  );
}

function Child({ onFetch }) {
  useEffect(() => {
    onFetch();
  }, [onFetch]); // reruns every time Parent re-renders — even though onFetch "does the same thing"
  return null;
}
```

**Task:** fix `Parent` so `Child`'s effect only runs once, using `useCallback`.

Try it yourself first.

<details>
<summary>✅ Show Answer</summary>

```jsx
function Parent() {
  const [count, setCount] = useState(0);

  const fetchSomething = useCallback(() => {
    console.log("fetching...");
  }, []); // empty deps = same function reference across every render

  return (
    <>
      <button onClick={() => setCount(count + 1)}>Re-render parent</button>
      <Child onFetch={fetchSomething} />
    </>
  );
}
```

**Why this works:** `useCallback(fn, deps)` returns the *same* function reference across renders as long as `deps` hasn't changed. Now `Child`'s effect dependency (`onFetch`) stays stable across `Parent` re-renders, so it only runs once. **The rule to remember:** `useCallback`/`useMemo` only matter when the memoized thing is *compared* somewhere — a dependency array, `React.memo`, etc. Sprinkling them everywhere else does nothing useful and adds overhead; profile first, memoize where it's proven to matter (React 19's compiler now automates much of this — see the React & JS guide).

</details>

---

## Exercise 10: The same hook, in React Native

**Goal:** confirm for yourself that fetch + hooks are identical on mobile — only the rendering primitives change.

**Task:** take the exact `useFetch` hook from Exercise 6 (or 7) and use it inside a React Native screen instead of a web page.

**Steps to follow:**
1. Copy `useFetch` verbatim — zero changes needed.
2. Swap the JSX: `<div>`/`<ul>`/`<li>` become `<View>`/`<FlatList>`/`<Text>`; a loading spinner is `<ActivityIndicator>` instead of a `<p>Loading...</p>`.
3. Use `FlatList`'s `data`, `keyExtractor`, and `renderItem` props instead of `.map()` — this is RN's virtualization-aware list component (see the RN guide's FlatList section for why this matters at scale).

Try it yourself first.

<details>
<summary>✅ Show Answer</summary>

```jsx
import { View, Text, FlatList, ActivityIndicator } from "react-native";

function UserListRN() {
  const { data: users, loading, error } = useFetch(
    "https://jsonplaceholder.typicode.com/users"
  );

  if (loading) return <ActivityIndicator />;
  if (error) return <Text>Error: {error}</Text>;

  return (
    <FlatList
      data={users}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <Text>{item.name}</Text>}
    />
  );
}
```

**Why this works — and what's actually different on mobile:** `fetch`, `useState`, `useEffect`, `useReducer`, and `AbortController` are all standard JavaScript/React — React Native ships the same APIs, so `useFetch` needed **zero changes**. What genuinely differs on mobile (not shown here, see [react-native-interview-guide.md](react-native-interview-guide.md) for detail):
- **The network can vanish mid-session** far more than on web — check connectivity with `NetInfo` before/during a fetch, rather than assuming the browser tab stays connected.
- **No `localStorage`** — the mobile equivalent for caching fetched data is `AsyncStorage` (or MMKV for speed), which is async by nature (another reason your hook already handles async well).

**Stretch challenge (no answer given — try it yourself):** add a simple cache layer to `useFetch` — after a successful fetch, save the result to `AsyncStorage` keyed by the URL; on mount, first try reading from `AsyncStorage` so the screen shows *something* immediately even before the network request resolves (or if it's offline entirely).

</details>

---

## What's next

In a real production app, you'd reach for **TanStack Query (React Query)** or **SWR** instead of hand-rolling `useFetch` — they add caching, retries, deduping, and background refetching on top of everything you just built by hand. The point of this workbook was to understand *what those libraries are actually doing for you* — see the "state management" and "frontend caching" sections of [react-js-frontend-interview-guide.md](react-js-frontend-interview-guide.md) for that layer.
