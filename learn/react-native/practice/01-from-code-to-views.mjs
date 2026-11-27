// Lesson 01: React runs your components until only host elements are left.
// Host elements are the ones that become a native view: "View", "Text", and so on.
// An element is a plain object: { type, props, children }.
// type is a string for a host element, or a function for your own component.

export function h(type, props = {}, ...children) {
  return { type, props: props || {}, children: children.flat() };
}

// Task 1: turn an element into a host tree.
// - a string stays a string
// - a host element (type is a string): keep type and props, reduce every child
// - a component (type is a function): call it with { ...props, children }, then reduce what it returns
export function reduceToHost(element) {
  // your code here
}

// Task 2: count the host nodes in a reduced tree. Strings do not count.
export function countHostNodes(tree) {
  // your code here
}
