// Lesson 14: Hasura: when and when not. Do the four tasks below, then run:
//   node --test learn/backend-api/practice/14-hasura-when-and-when-not.test.js
//
// You build a tiny version of Hasura's permission engine. No packages needed.
//
// A rule lives in a permissions object: permissions[table][role][action].
// A session is an object with lower-case names, for example { "x-hasura-role": "user", "x-hasura-user-id": "7" }.
// In a rule, a value that starts with "X-Hasura-" (any case) means: use the value from the session.
// Compare values as text: String(a) === String(b). (Hasura turns the session text into the column type.)
const PERMISSIONS_EXAMPLE = {
  notes: {
    user: {
      select: { filter: { owner_id: { _eq: "X-Hasura-User-Id" } }, columns: ["id", "title", "owner_id"], limit: 2 },
      insert: { check: { owner_id: { _eq: "X-Hasura-User-Id" } }, set: { owner_id: "X-Hasura-User-Id" }, columns: ["title"] },
    },
    viewer: { select: { filter: {}, columns: ["id", "title"] } },
  },
};

// 1. WRITE IT: matches(row, filter, session)  returns true or false
//    filter is an object. Every key must match (that is an AND). A key is one of:
//      a column name:  { owner_id: { _eq: 7 } }        the value is an object with one or more operators
//         _eq   row[column] equals the value
//         _neq  row[column] does not equal the value
//         _in   row[column] equals one of the values in the list
//      _and:  [filter, filter, ...]   all of them match
//      _or:   [filter, filter, ...]   at least one matches
//      _not:  filter                  the filter does not match
//    Rules:
//      - An empty filter {} matches every row.
//      - A value that starts with "X-Hasura-" is read from the session (use the lower-case name).
//      - Like SQL: if the row value is null/undefined, or the value from the session is missing,
//        _eq, _neq and _in are all FALSE. A missing session variable must never give more rows.
//      - An unknown operator is false (deny by default).
//      - It must never throw. A row or filter that is not an object gives false.
function matches(row, filter, session) {
  // TODO
}

// 2. WRITE IT: runSelect({ permissions, table, role, session, rows })
//    Returns { ok: true, rows } or { ok: false, error: "no access" }.
//      - The role "admin" may read everything: all rows, all columns, no limit.
//      - Any other role needs a rule at permissions[table][role].select. No rule (or no table): { ok: false, error: "no access" }.
//        Careful: a role called "toString" or "__proto__" is not a rule (use Object.hasOwn).
//      - Keep only the rows that match rule.filter (a missing filter means {}).
//      - Then keep only the columns in rule.columns. The value "*" means all columns.
//      - Then, if rule.limit is a whole number, keep only the first rule.limit rows.
//      - Return NEW objects. Do not change the rows that came in.
function runSelect({ permissions, table, role, session, rows }) {
  // TODO
}

// 3. WRITE IT: prepareInsert({ permissions, table, role, session, input })
//    Returns { ok: true, row } or { ok: false, error }.
//      - The role "admin" may insert anything (no check, no presets, any columns).
//      - Any other role needs a rule at permissions[table][role].insert. None: { ok: false, error: "no access" }.
//      - Start with an empty row. For each column the client sent in input:
//          * if rule.set has that column, ignore what the client sent (the preset wins);
//          * else if rule.columns is not "*" and does not list the column: return
//            { ok: false, error: "column not allowed: <name>" };
//          * else copy it into the row.
//      - Then add every preset from rule.set (read the "X-Hasura-..." values from the session).
//      - Then run rule.check (a missing check means {}) on the final row with matches.
//        If it fails: { ok: false, error: "check failed" }.
//      - Otherwise { ok: true, row }.
function prepareInsert({ permissions, table, role, session, input }) {
  // TODO
}

// 4. THINK: where does each job belong? Choose one of:
//    "hasura" | "action" | "event trigger" | "own service" | "gateway"
const choices = {
  adminPanelForOnePostgresTeam: "",
  redeemPointsCallingAThirdPartyApi: "",
  sendEmailAfterAnOrderRowIsInserted: "",
  checkoutWithManyStepsAndMoneyRules: "",
  rateLimitingOnFreeSelfHostedHasura: "",
};

module.exports = { PERMISSIONS_EXAMPLE, matches, runSelect, prepareInsert, choices };
