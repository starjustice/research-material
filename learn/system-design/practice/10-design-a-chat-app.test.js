const test = require("node:test");
const assert = require("node:assert");
const { createChatServer } = require("./10-design-a-chat-app");

// A fake phone. It keeps every message that arrives on its open line.
function phone() {
  const got = [];
  const line = (msg) => got.push(msg.text);
  return { got, line };
}

function setup() {
  const chat = createChatServer();
  chat.addChat("dm1", ["alice", "bob"]);
  chat.addChat("g1", ["alice", "bob", "cara"]);
  return chat;
}

// ---- Save, then deliver ----

test("send saves the message and gives back an id that grows by 1", () => {
  const chat = setup();
  assert.deepStrictEqual(chat.send("alice", "dm1", "c1", "hi"), { messageId: 1 });
  assert.deepStrictEqual(chat.send("alice", "dm1", "c2", "there"), { messageId: 2 });
  assert.deepStrictEqual(chat.history("dm1").map((m) => m.text), ["hi", "there"]);
});

test("a saved message has id, chatId, senderId and text", () => {
  const chat = setup();
  chat.send("alice", "dm1", "c1", "hi");
  assert.deepStrictEqual(chat.history("dm1"), [{ id: 1, chatId: "dm1", senderId: "alice", text: "hi" }]);
});

test("an online member gets the message on their open line", () => {
  const chat = setup();
  const bob = phone();
  chat.connect("bob", bob.line);
  chat.send("alice", "dm1", "c1", "hi");
  assert.deepStrictEqual(bob.got, ["hi"]);
});

test("the sender does not get their own message on their line", () => {
  const chat = setup();
  const alice = phone();
  chat.connect("alice", alice.line);
  chat.send("alice", "dm1", "c1", "hi");
  assert.deepStrictEqual(alice.got, []);
});

test("an offline member gets a push, not a message", () => {
  const chat = setup();
  chat.send("alice", "dm1", "c1", "hi");
  assert.deepStrictEqual(chat.pushes, [{ userId: "bob", chatId: "dm1", messageId: 1 }]);
});

test("a group message goes to each online member and pushes to each offline one", () => {
  const chat = setup();
  const bob = phone();
  chat.connect("bob", bob.line);
  chat.send("alice", "g1", "c1", "lunch?");
  assert.deepStrictEqual(bob.got, ["lunch?"]);
  assert.deepStrictEqual(chat.pushes, [{ userId: "cara", chatId: "g1", messageId: 1 }]);
});

test("after disconnect, the member is offline again", () => {
  const chat = setup();
  const bob = phone();
  chat.connect("bob", bob.line);
  chat.disconnect("bob");
  chat.send("alice", "dm1", "c1", "hi");
  assert.deepStrictEqual(bob.got, []);
  assert.strictEqual(chat.pushes.length, 1);
});

test("a broken line counts as offline: the message stays saved and a push goes out", () => {
  const chat = setup();
  chat.connect("bob", () => { throw new Error("connection server B is down"); });
  assert.deepStrictEqual(chat.send("alice", "dm1", "c1", "hi"), { messageId: 1 });
  assert.deepStrictEqual(chat.history("dm1").map((m) => m.text), ["hi"]);
  assert.deepStrictEqual(chat.pushes, [{ userId: "bob", chatId: "dm1", messageId: 1 }]);
});

// ---- The resend after a lost ack ----

test("the same clientMsgId from the same sender is saved only once", () => {
  const chat = setup();
  const bob = phone();
  chat.connect("bob", bob.line);
  assert.deepStrictEqual(chat.send("alice", "dm1", "c1", "hi"), { messageId: 1 });
  assert.deepStrictEqual(chat.send("alice", "dm1", "c1", "hi"), { messageId: 1 });   // the resend
  assert.strictEqual(chat.history("dm1").length, 1);
  assert.deepStrictEqual(bob.got, ["hi"]);
});

test("two senders may use the same clientMsgId, because each phone makes its own", () => {
  const chat = setup();
  chat.send("alice", "g1", "c1", "from alice");
  chat.send("bob", "g1", "c1", "from bob");
  assert.deepStrictEqual(chat.history("g1").map((m) => m.text), ["from alice", "from bob"]);
});

// ---- Catching up after being offline ----

test("history with afterId gives only the newer messages, in order", () => {
  const chat = setup();
  ["one", "two", "three"].forEach((t, i) => chat.send("alice", "dm1", "c" + i, t));
  assert.deepStrictEqual(chat.history("dm1", { afterId: 1 }).map((m) => m.text), ["two", "three"]);
  assert.deepStrictEqual(chat.history("dm1", { afterId: 3 }), []);
});

test("history is kept per chat", () => {
  const chat = setup();
  chat.send("alice", "dm1", "c1", "private");
  chat.send("alice", "g1", "c2", "group");
  assert.deepStrictEqual(chat.history("dm1").map((m) => m.text), ["private"]);
  assert.deepStrictEqual(chat.history("g1").map((m) => m.text), ["group"]);
});

// ---- The ticks ----

test("a new message is sent, one tick", () => {
  const chat = setup();
  chat.send("alice", "dm1", "c1", "hi");
  assert.strictEqual(chat.status("dm1", 1), "sent");
});

test("delivered up to an id marks every message up to it", () => {
  const chat = setup();
  chat.send("alice", "dm1", "c1", "one");
  chat.send("alice", "dm1", "c2", "two");
  chat.send("alice", "dm1", "c3", "three");
  chat.markDelivered("bob", "dm1", 2);
  assert.deepStrictEqual([1, 2, 3].map((id) => chat.status("dm1", id)), ["delivered", "delivered", "sent"]);
});

test("read also means delivered", () => {
  const chat = setup();
  chat.send("alice", "dm1", "c1", "hi");
  chat.markRead("bob", "dm1", 1);
  assert.strictEqual(chat.status("dm1", 1), "read");
});

test("in a group, read needs every other member to have read it", () => {
  const chat = setup();
  chat.send("alice", "g1", "c1", "one");
  chat.send("alice", "g1", "c2", "two");
  chat.markRead("bob", "g1", 2);
  chat.markRead("cara", "g1", 1);
  assert.deepStrictEqual([1, 2].map((id) => chat.status("g1", id)), ["read", "sent"]);
  chat.markDelivered("cara", "g1", 2);
  assert.strictEqual(chat.status("g1", 2), "delivered");
});

test("a late, older receipt never moves the ticks back", () => {
  const chat = setup();
  chat.send("alice", "dm1", "c1", "one");
  chat.send("alice", "dm1", "c2", "two");
  chat.markRead("bob", "dm1", 2);
  chat.markRead("bob", "dm1", 1);        // arrives late
  chat.markDelivered("bob", "dm1", 1);   // arrives late
  assert.strictEqual(chat.status("dm1", 2), "read");
});
