// Lesson 11: Flexbox in React Native. Fill in the style objects.
// Run the tests with:  npm install && npm run test:11
// The screen is 300 wide and 600 tall. Remember the React Native defaults.

const BOX = { width: 50, height: 50 };

// Task 1: one 50x50 box sits in the exact middle of the screen.
// Return the style of the PARENT View. Expected: the box is at x 125, y 275.
export function centerOne() {
  return {};
}

// Task 2: three 50x50 boxes in one row. The first touches the left edge,
// the last touches the right edge, the middle one is in the middle.
// Expected: x is 0, 125 and 250, and every y is 0.
export function spreadRow() {
  return {};
}

// Task 3: a screen with a header (60 tall), a content area and a footer (50 tall).
// Return the styles of the three children. The parent is a plain View on the screen.
// The content area must take all the space that is left.
// Expected: content at y 60 and 490 tall, footer at y 550.
export function appShell() {
  return { header: {}, content: {}, footer: {} };
}

// Task 4: two children in a row, each 50 tall, sharing the width equally.
// Return { container, child }. Neither child may have a fixed width.
// Expected: x is 0 and 150, each 150 wide.
export function twoEqualColumns() {
  return { container: {}, child: {} };
}

// Task 5: five 100x100 boxes in a grid that wraps.
// Return the style of the parent View.
// Expected: (0,0) (100,0) (200,0) on the first row, (0,100) (100,100) on the second.
export function wrapGrid() {
  return {};
}

// Task 6: a 20x20 badge in the top right corner of a 300x600 card.
// Return the style of the BADGE. It is the only child and it must not push anything.
// Expected: x 280, y 0, 20 wide, 20 tall.
export function cornerBadge() {
  return {};
}

export { BOX };
