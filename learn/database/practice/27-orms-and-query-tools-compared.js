// Lesson 27: ORMs and query tools compared. Do the three tasks below, then run:
//   node --test learn/database/practice/27-orms-and-query-tools-compared.test.js
//
// You will write a tiny query builder, the same idea that Kysely and Drizzle use.
// No database is needed. The builder only makes text and a list of values.

// Given to you: the tables the builder knows about (the "schema").
const SCHEMA = {
  orders: ["id", "store_id", "status", "total_cents"],
  stores: ["id", "name"],
};

// 1. WRITE IT: quoteIdent(name, allowed)
//    A name (a table or a column) goes into the SQL text, so it cannot be a $1 value.
//    Return the name in double quotes, like "id", only if it is in the allowed list.
//    Otherwise throw an Error. A typo, or text like  id; DROP TABLE orders  must throw.
function quoteIdent(name, allowed) {
  // TODO
}

// 2. WRITE IT: buildSelect(spec, schema)  returns { sql, params }
//    spec is { table, columns, where, orderBy, limit }
//      table   : a table name from the schema
//      columns : an array of column names of that table
//      where   : optional object, like { store_id: 1, status: "paid" }. Every pair means  "column" = $n
//                and the pairs are joined with " and ". The values go into params, in order.
//      orderBy : optional { column, direction }. direction must be "asc" or "desc", else throw.
//      limit   : optional. Must be a whole number above 0, else throw. It goes into params as the last value.
//    Every table and column name must pass quoteIdent for that table.
//    The SQL is lower case and looks exactly like this (the same text Kysely printed in the lesson):
//      select "id", "total_cents" from "orders" where "store_id" = $1 and "status" = $2 order by "id" desc limit $3
//    Parts that are not asked for are left out.
function buildSelect(spec, schema) {
  // TODO
}

// 3. THINK: for each situation write one word: "raw-sql", "query-builder", "orm" or "hasura".
const choices = {
  oneHeavyReportWithWindowFunctions: "",                    // you want to write and tune every word of the SQL
  typedQueriesThatStillReadLikeSql: "",                     // you want the SQL shape, and a compile error on a typo
  modelsRelationsAndMigrationsFromOneSchemaFile: "",        // one tool for types, queries and schema changes
  quickCrudApiWithRowRulesAndNoResolverCode: "",            // you do not want to write the API at all
};

module.exports = { SCHEMA, quoteIdent, buildSelect, choices };
