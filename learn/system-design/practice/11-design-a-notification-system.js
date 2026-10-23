// Lesson 11: Design a notification system. Write createDispatcher below, then run:
//   node --test learn/system-design/practice/11-design-a-notification-system.test.js

// createDispatcher({ send, maxTries, baseMs, sleep }) makes a small dispatcher: the worker that
// sits between a queue and an outside provider (push, email or SMS).
//
//   send(msg)   an async function that calls the provider. It resolves when the provider accepted
//               the message. It throws when the provider failed. If the error has
//               err.permanent === true (for example "this token is not registered"), retrying
//               can never help. Any other error is temporary (for example "503 provider busy").
//   maxTries    how many times to call send for one message. The default is 3.
//   baseMs      the first wait between tries. The wait doubles each time. The default is 100.
//   sleep(ms)   an async function that waits. The default does not wait at all, so tests are fast.
//
// It returns an object with these methods:
//
//   dispatch(msg)   msg looks like { user, event, channel, body }.
//                   The dedupe key is the three words user + ":" + event + ":" + channel.
//                   It returns a promise of { status, tries, waits }:
//
//                   - If this key was already sent, or is being sent right now by another call,
//                     do not call send. Return { status: "duplicate", tries: 0, waits: [] }.
//                   - Otherwise call send(msg), up to maxTries times.
//                       * On success return { status: "sent", tries, waits }.
//                       * After a temporary error, call sleep(wait) and try again. The waits are
//                         baseMs, then baseMs * 2, then baseMs * 4, and so on. `waits` lists the
//                         waits used so far. There is no wait after the last try.
//                       * After a permanent error, or when the last try fails, stop. Put the
//                         message in the dead letters and return { status: "dead", tries, waits }.
//
//                   Two calls with the same key at the same moment must call send only once.
//                   A dead message is not remembered as sent, so it can be dispatched again.
//
//   deadLetters()   an array of { msg, error, tries } for the dead messages, oldest first.
//                   error is the error message text of the last failure.
function createDispatcher(options) {
  // TODO
}

module.exports = { createDispatcher };
