// Lesson 10: skip work that did not change. This is a MODEL of React.memo and useCallback.
// The real ones live inside React. The idea is the same: compare with Object.is, one level deep.

// Task 1: shallowEqual(a, b)
// Two objects are equal when they have the same keys and every value is the same by Object.is.
// Do not look inside the values. { user: { n: 1 } } and { user: { n: 1 } } are NOT equal.
export function shallowEqual(a, b) {
  // your code here
}

// Task 2: createMemoComponent(renderFn)
// Returns an object with:
//   render(props)    runs renderFn(props) only the first time, or when props are not
//                    shallowEqual to the props of the last real render.
//                    Otherwise it returns the output it kept from last time.
//   renderCount      how many times renderFn really ran (a number you can read)
export function createMemoComponent(renderFn) {
  // your code here
}

// Task 3: createCallbackCache()
// Returns { get(fn, deps) }, a model of useCallback.
//   - the first call keeps fn and returns it
//   - a later call with the same deps (same length, each item equal by Object.is)
//     returns the KEPT function and ignores the new fn
//   - changed deps: keep the new fn and return it
export function createCallbackCache() {
  // your code here
}
