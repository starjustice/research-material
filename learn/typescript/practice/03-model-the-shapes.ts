// Lesson 03: type or interface? Write each type below.
// Run the checks:  node --test 03-model-the-shapes.test.ts
// The tests run the real TypeScript compiler (strict mode) on this file.

// 1. interface User: id (string), name (string), email (string, but optional)
export interface User {
  // your code here
}

// 2. interface Admin: everything a User has, plus permissions (a list of strings).
//    Use "extends". Do not copy the User fields.
export interface Admin {
  // your code here
}

// 3. type Id: a string or a number. Only a type alias can do this. An interface cannot.
export type Id = never; // your code here

// 4. type Point: an object with x and y, both numbers
export type Point = {}; // your code here

// 5. type Pair: a tuple. First a string, then a number.
export type Pair = string[]; // your code here

// 6. type Formatter: a function that takes a number and returns a string
export type Formatter = unknown; // your code here

// 7. Declaration merging. Write interface Config with host (string) here,
//    then a SECOND "export interface Config" block below it with port (number).
//    TypeScript joins the two blocks into one Config.
export interface Config {
  // your code here
}
// your code here: the second Config block (port, a number)

// 8. A mapped type, written by hand (do not use the built in Readonly).
//    ReadOnlyCopy<T> has the same keys as T, with the same value types, but every key is readonly.
//    Pattern to copy: { [K in keyof T]: T[K] }
//    Only a type alias can be a mapped type. An interface cannot.
export type ReadOnlyCopy<T> = T; // your code here

// Helper functions. The types above must be right for these to compile.
// Fill in the bodies too.

// "Ana" when there is no email, "Ana (ana@x.com)" when there is one
export function describeUser(user: User): string {
  // your code here
  return "";
}

// the user text, then a space, then the permissions in square brackets joined with ", "
// Example: "Bo [read, write]"
export function describeAdmin(admin: Admin): string {
  // your code here
  return "";
}

// a string stays as it is, a number gets a # in front: 7 becomes "#7"
export function formatId(id: Id): string {
  // your code here
  return "";
}

// the straight line distance between two points
export function distance(a: Point, b: Point): number {
  // your code here
  return 0;
}

// swap the order of a pair: ["a", 1] becomes [1, "a"]
export function swap(pair: Pair): [number, string] {
  // your code here
  return [0, ""];
}

// a Formatter that turns 5 into "$5.00" (two decimals)
export const toMoney: Formatter = (value: number): string => {
  // your code here
  return "";
};

// a frozen copy: the properties cannot be changed, in the type and at run time
export function lock<T extends object>(value: T): ReadOnlyCopy<T> {
  // your code here
  return value;
}
