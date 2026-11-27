// Lesson 04: a FlatList only keeps the rows near the screen. This is a small model of that idea.
// Heights are fixed, so we can work out where every row is, like getItemLayout does.

// Task 1: where is row `index`? Return { length, offset, index }.
// length is the row height. offset is how far the top of the row is from the top of the list.
export function getItemLayout(index, itemHeight) {
  // your code here
}

// Task 2: which rows should stay mounted?
// windowSize counts in screens. 1 is one screen. 21 is the default: 10 screens above,
// the screen you see, and 10 screens below. Return { first, last } (both rows are kept).
// first is never below 0, and last is never above itemCount - 1.
// An empty list returns { first: 0, last: -1 }.
export function windowRange({ scrollY, viewportHeight, itemHeight, itemCount, windowSize }) {
  // your code here
}

// Task 3: the key for a row. Use item.key, then item.id, then the index.
// The key is always a string. An id of 0 is a real id.
export function keyExtractor(item, index) {
  // your code here
}
