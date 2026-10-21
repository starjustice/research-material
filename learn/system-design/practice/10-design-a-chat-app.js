// Lesson 10: Design a chat app. Write createChatServer below, then run:
//   node --test learn/system-design/practice/10-design-a-chat-app.test.js
//
// One object plays the whole back end: the connection servers, the "who is online" map,
// the message store and the push queue. A phone's open line is a function: line(msg).
//
// createChatServer() returns an object with:
//
//   pushes
//     An array. Each time a member is offline, add { userId, chatId, messageId } to it.
//
//   addChat(chatId, memberIds)
//     Makes a chat. Two members is a one to one chat. More is a group.
//
//   connect(userId, line) and disconnect(userId)
//     The phone opens or closes its line. While connected, the server calls line(msg) to deliver.
//
//   send(senderId, chatId, clientMsgId, text)  ->  { messageId }
//     1. Save first. A saved message looks like { id, chatId, senderId, text }.
//        Ids start at 1 and grow by 1, across all chats.
//     2. Then deliver to every member except the sender:
//          online  -> call their line(msg)
//          offline -> add a push
//          their line throws (their connection server is down) -> treat them as offline: add a push
//     3. Return { messageId }. This is the ack, the first tick.
//     A resend with the same senderId and clientMsgId must not save or deliver again.
//     It returns the same { messageId } as the first time.
//
//   history(chatId, { afterId = 0 } = {})  ->  [messages]
//     The saved messages of this chat with an id bigger than afterId, oldest first.
//     A phone that comes back online calls this with the last id it has.
//
//   markDelivered(userId, chatId, upToId) and markRead(userId, chatId, upToId)
//     Keep only two numbers per member per chat: the last id delivered and the last id read.
//     Everything up to that id counts. The numbers only move forward, never back.
//     Read also means delivered.
//
//   status(chatId, messageId)  ->  "sent" | "delivered" | "read"
//     Look at every member except the sender of that message.
//     "read" if all of them have read up to this id or later,
//     else "delivered" if all of them have it delivered up to this id or later,
//     else "sent".
function createChatServer() {
  // TODO
}

module.exports = { createChatServer };
