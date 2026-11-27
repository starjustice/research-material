// Lesson 01: types vanish when the code runs.
// JSON.parse gives back whatever was in the text. The type User does not exist at runtime,
// so you must check the data yourself.

export interface User {
  name: string;
  age: number;
}

// Task 1: return true only if value is an object (not null, not an array)
// with a string `name` and a number `age`.
export function isUser(value: unknown): value is User {
  // your code here
}

// Task 2: turn JSON text into a User, or throw an Error with a clear message.
// - text that is not valid JSON: the message says "Invalid JSON"
// - JSON that is not an object (null, 42, [], "x"): the message says "Expected an object"
// - a missing or wrong field: the message names the field, for example: Field "age" must be a number
export function parseUser(json: string): User {
  // your code here
}
