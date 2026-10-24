// Lesson 18: Choosing an API style. Do the four tasks below, then run:
//   node --test learn/backend-api/practice/18-choosing-an-api-style.test.js
//
// No packages needed. You turn the four questions of section 2f into code.
//
// "needs" is an object that describes a project. Every key is optional, and a missing key means false:
//   publicThirdParties                 other companies call this API
//   serviceToService                   the caller is another server
//   needsStreaming                     the calls stream data
//   manyLanguages                      the services use several programming languages
//   clientsAreAllTypeScriptInOneRepo   every caller is a TypeScript app in the same repo as the server
//   oldClientsStayInstalled            old versions of the client stay in use for months (a mobile app in the stores)
//   manyClientsNeedDifferentFields     different apps want different fields of the same data
//   serverPushToBrowser                "one-way", "two-way", or anything else for no push

// 1. WRITE IT: chooseStyle(needs)   returns { api, push }
//    api is one of "rest", "graphql", "trpc", "grpc". Ask the questions IN THIS ORDER. The first yes wins:
//      1. publicThirdParties                                              -> "rest"
//      2. serviceToService AND (needsStreaming OR manyLanguages)          -> "grpc"
//      3. clientsAreAllTypeScriptInOneRepo AND NOT oldClientsStayInstalled -> "trpc"
//      4. manyClientsNeedDifferentFields                                  -> "graphql"
//      5. otherwise                                                       -> "rest"
//    push is a SEPARATE answer (lesson 17), so it does not change api:
//      serverPushToBrowser is "two-way" -> "websocket",  "one-way" -> "sse",  anything else -> "none"
//    chooseStyle() with nothing, or with null, counts as an empty object. Do not change the object you were given.
function chooseStyle(needs = {}) {
  // TODO
}

// 2. WRITE IT: fill in this table of facts about each style (sections 4 and 5 of the lesson).
//      readMethod     the HTTP method for a simple read: "GET" or "POST"
//      body           "json" or "protobuf"
//      browserDirect  true if a browser can call it directly, with no extra tool
//      callers        "anyone", "typescript only" or "any language"
//    Put in the real values. They are blank now.
const facts = {
  rest:    { readMethod: "", body: "", browserDirect: null, callers: "" },
  graphql: { readMethod: "", body: "", browserDirect: null, callers: "" },
  trpc:    { readMethod: "", body: "", browserDirect: null, callers: "" },
  grpc:    { readMethod: "", body: "", browserDirect: null, callers: "" },
};

// 3. WRITE IT: requestsForUserAndOrders(style)   how many HTTP requests one page needs to get a user AND the user's orders
//    Use the table in section 2d (job 2). Return a number.
//    For a name that is not one of the four styles, return undefined. Watch out for names like "constructor".
function requestsForUserAndOrders(style) {
  // TODO
}

// 4. THINK: fill in each answer.
const answers = {
  firstQuestion: "",                    // "who calls it" or "how fast is it"
  publicApiForOtherCompanies: "",       // "rest", "graphql", "trpc" or "grpc"
  differentFieldsForDifferentApps: "",  // "rest", "graphql", "trpc" or "grpc"
  typescriptMonorepoShippedTogether: "", // "rest", "graphql", "trpc" or "grpc"
  busyServiceToServiceWithStreaming: "", // "rest", "graphql", "trpc" or "grpc"
  oneWayLiveUpdatesToABrowser: "",      // "sse" or "websocket"
};

module.exports = { chooseStyle, facts, requestsForUserAndOrders, answers };
