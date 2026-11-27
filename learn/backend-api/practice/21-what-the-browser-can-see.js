// Lesson 21: What the browser can see. Do the three tasks below, then run:
//   node --test learn/backend-api/practice/21-what-the-browser-can-see.test.js
//
// The idea: anything the browser sends or receives is visible to the user in the Network tab.
// You cannot hide it. What you CAN do is keep secrets on the server and check every request there.

// 1. decodeScrambled(text)
//    A teammate "scrambled" a JSON answer with base64 so "nobody can read it".
//    Prove it is not safe: take the base64 text, turn it back into text, and return the parsed object.
//    Hint: Buffer.from(text, "base64").toString("utf8") and JSON.parse.
function decodeScrambled(text) {
  // TODO
}

// 2. pickFields(object, allowedNames)
//    Return a NEW object that has only the keys listed in allowedNames (an array of strings).
//    Keys that are not in the object are left out (do not add undefined values).
//    This is how you send less: the screen needs city and temp, so nothing else should leave the server.
function pickFields(object, allowedNames) {
  // TODO
}

// 3. makeWeatherHandler({ apiKey, callThirdParty, getUserId, allowRequest })
//    Returns an async function handle(request) that runs on YOUR server. request looks like
//    { headers: { cookie: "..." }, query: { city: "Jakarta" } }.
//    Do these steps in this order:
//      a) userId = getUserId(request). If it is null, return { status: 401, body: { error: "login first" } }.
//      b) If allowRequest(userId) is false, return { status: 429, body: { error: "slow down" } }.
//      c) data = await callThirdParty(request.query.city, apiKey). The key goes ONLY to the third party.
//      d) Return { status: 200, body: pickFields(data, ["city", "temp"]) }.
//    The key must never appear in the returned body.
function makeWeatherHandler({ apiKey, callThirdParty, getUserId, allowRequest }) {
  // TODO
}

module.exports = { decodeScrambled, pickFields, makeWeatherHandler };
