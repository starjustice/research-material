// Lesson 04: GraphQL basics. Write the three functions below, then run:
//   node --test learn/backend-api/practice/04-graphql-basics.test.js
//
// You build a tiny copy of what a GraphQL server does with one query:
// check it against the schema first, then fill in only the fields the client asked for.
// No npm install. No text parsing: the query comes already written as an object.
//
// ---- The schema: the menu of types and fields ----
//
//   const schema = {
//     Query: { orders: "[Order]", shop: "Shop" },
//     Order: { id: "ID", status: "String", total: "Int", shop: "Shop" },
//     Shop:  { id: "ID", name: "String" },
//   };
//
//   "ID", "String", "Int" and "Boolean" are plain values (scalars). Any other name is a type in the schema.
//   "[Order]" means a list of Order.
//
// ---- The query, already turned into an object ----
//
//   The text   { orders { id shop { name } } }
//   becomes    { orders: { id: true, shop: { name: true } } }
//
//   true      means "give me this plain value".
//   an object means "go inside this type and give me these fields".
//
// ---- Part 1: validate(schema, selection, typeName = "Query") returns an array of messages ----
//
//   Walk the selection against the schema, starting at typeName. Collect every problem, in the
//   order of the selection. Return [] when the query is fine. Messages (the real graphql-js text,
//   without the "!" and without the "Did you mean" hint):
//
//     a field that is not on the type:
//       Cannot query field "price" on type "Order".
//     a field whose type is an object type (or a list of one), selected with true:
//       Field "shop" of type "Shop" must have a selection of subfields.
//     a field whose type is a scalar, selected with an object:
//       Field "id" must not have a selection since type "ID" has no subfields.
//
//   For the list type, put the brackets in the message: Field "orders" of type "[Order]" must ...
//
// ---- Part 2: execute(schema, parent, selection, typeName = "Query") returns the data ----
//
//   For each field in the selection, in the selection's order:
//     1. Read parent[field]. If it is a function, call it with no arguments and use what it returns.
//        (That function is a tiny resolver. Lesson 05 is all about them.)
//     2. null or undefined  ->  null
//     3. a list type        ->  run step 4 or 5 for every item
//     4. an object type     ->  go inside: execute(schema, value, subSelection, thatType)
//     5. a scalar           ->  the value as it is
//   Fields that were not asked for are never in the result, even if the parent has them.
//
// ---- Part 3: run(schema, root, selection) returns what the client gets ----
//
//   Validate first. If there are messages, return { errors: [{ message }, ...] } and run nothing:
//   no function on root may be called. Otherwise return { data: execute(...) }.

function validate(schema, selection, typeName = "Query") {
  // TODO
}

function execute(schema, parent, selection, typeName = "Query") {
  // TODO
}

function run(schema, root, selection) {
  // TODO
}

module.exports = { validate, execute, run };
