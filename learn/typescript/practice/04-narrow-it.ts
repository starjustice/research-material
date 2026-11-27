// Lesson 04: narrowing. Write the bodies so the file compiles under strict mode
// and every test passes. Do not change the types or the function signatures.
// Run:  node --test 04-narrow-it.test.ts

export type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number }
  | { kind: "rectangle"; width: number; height: number };

export type Result = { ok: true; value: number } | { ok: false; error: string };

// Task 1: the compiler uses this to prove you handled every case.
// At run time, if it is ever called, throw an Error whose message starts with
// "Unexpected value: " and then the value as JSON (JSON.stringify).
export function assertNever(x: never): never {
  // your code here
}

// Task 2: circle is PI * radius * radius, square is side * side, rectangle is width * height.
// Use a switch on shape.kind. The default branch must call assertNever(shape).
export function area(shape: Shape): number {
  // your code here
}

// Task 3: a number becomes "#" and the number padded with zeros to 5 digits: 42 -> "#00042".
// A string is trimmed and made upper case: " ab7 " -> "AB7". Use typeof.
export function formatId(id: string | number): string {
  // your code here
}

// Task 4: null or undefined -> "nothing". An empty string -> "empty text".
// Any other string -> "text: " and the string. An array -> "list of " and its length.
// Watch out: "" is falsy, so a plain if (value) check is not enough.
export function describe(value: string | string[] | null | undefined): string {
  // your code here
}

// Task 5: use the in operator. hasName says if the object has a name.
// labelOf returns the name if there is one, otherwise the title.
export function hasName(x: { name: string } | { title: string }): boolean {
  // your code here
}
export function labelOf(x: { name: string } | { title: string }): string {
  // your code here
}

// Task 6: parseAge builds a Result. "42" -> { ok: true, value: 42 }.
// Not a whole number ("abc", "", "4.5") -> { ok: false, error: "not a whole number: " + text }.
// A whole number below 0 or above 150 -> { ok: false, error: "out of range: " + n }.
// unwrap returns the value for ok: true, and throws an Error with the error text for ok: false.
export function parseAge(text: string): Result {
  // your code here
}
export function unwrap(result: Result): number {
  // your code here
}
