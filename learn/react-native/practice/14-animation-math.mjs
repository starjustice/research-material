// Lesson 14: The maths behind Animated. You will rebuild three small pieces.
// Run the tests with:  npm run test:14

// Task 1: interpolate. Map a number from one range to another, like Animated's value.interpolate.
//   interpolate(0.5, [0, 1], [0, 100])                     is 50
//   interpolate(0.5, [0, 0.5, 1], [0, 100, 100])            is 100   (several segments)
//   interpolate(2, [0, 1], [0, 100])                        is 200   (default: extend the line)
//   interpolate(2, [0, 1], [0, 100], { extrapolate: "clamp" })  is 100
// options can hold extrapolate, extrapolateLeft, extrapolateRight. Values are "extend" or "clamp".
// A specific side (extrapolateLeft or extrapolateRight) wins over extrapolate.
export function interpolate(value, inputRange, outputRange, options = {}) {
  return value;
}

// Task 2: the value of a timing animation after some time has passed.
// progress goes from 0 to 1 over `duration` ms and never goes outside 0 and 1.
// The result is from + (to - from) * easing(progress). The default easing is linear: (t) => t.
export function timingValue({ from, to, elapsed, duration, easing = (t) => t }) {
  return from;
}

// Task 3: diffClamp, used to hide a header while you scroll down and show it when you scroll up.
// makeDiffClamp(min, max, start) returns a function. Call it with the new scroll position `a`.
// The difference since the last call is added to the current value, and the result is kept between min and max.
// The first "last position" is `start`, and the first value is `start` too.
export function makeDiffClamp(min, max, start = 0) {
  return (a) => a;
}
