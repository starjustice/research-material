// Tiny Action handler — plain Node, no dependencies. Run: node handler.js
// Hasura forwards the Action call here as a POST with { input: {...}, session_variables: {...} }.
const http = require("http");

http
  .createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const { input, session_variables } = JSON.parse(body || "{}");
      console.log("Action called by role:", session_variables?.["x-hasura-role"]);

      // The "business logic": shout the text back.
      const result = { shouted: String(input?.text ?? "").toUpperCase() + "!" };

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    });
  })
  .listen(3000, () => console.log("Action handler on http://localhost:3000"));
