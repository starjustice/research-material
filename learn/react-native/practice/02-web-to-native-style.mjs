// Lesson 02: web CSS and React Native styles look alike, but they are not the same.

// Task 1: turn a CSS text into a React Native style object.
// - "margin-top: 8px" becomes marginTop: 8   (camelCase name, px removed, a number)
// - "flex: 1" becomes flex: 1                (a plain number becomes a number)
// - "width: 50%" and "color: red" stay strings
// Several rules are split by ";". Skip empty parts.
export function toNativeStyle(cssText) {
  // your code here
}

// Task 2: the style prop can be an array. Later items win. false, null and
// undefined are skipped, and arrays can be nested. Return ONE plain object.
// Do not change the objects you were given.
export function flattenStyle(style) {
  // your code here
}
