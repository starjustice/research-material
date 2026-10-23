// Lesson 11: Design a notification system. Write createNotifier below, then run:
//   node --test learn/system-design/practice/11-design-a-notification-system.test.js
//
// One object plays the notification service, the channel queues and the workers.
// The outside companies (Apple, Google, the email and SMS providers) are a function you are given:
// send(job) returns a number, like the HTTP status code a real provider sends back.
//
// The three channels, always checked in this order: "push", "email", "sms".
// The three priorities, worked in this order: "urgent" (an OTP), "normal" (loan approved), "bulk" (marketing).
//
// createNotifier({ maxTries = 3, bulkPerDay = 2 } = {}) returns an object with:
//
//   setPrefs(userId, { channels, quietStart, quietEnd })
//     channels: the channels this user allows. A user with no prefs allows ["push", "email"].
//     quietStart and quietEnd: hours 0 to 23 in the user's own time, for example 22 and 7.
//     Quiet means hour >= quietStart or hour < quietEnd when the window crosses midnight,
//     and quietStart <= hour < quietEnd when it does not. No numbers means no quiet hours.
//
//   addToken(userId, token) and tokensOf(userId) -> [tokens]
//     A device token is the address of one app on one phone. A user can have several.
//
//   notify({ eventId, userId, text, hour, priority = "normal", channels })
//       -> { queued: [keys], held: [keys], skipped: [{ channel, reason }] }
//     channels: the channels this event wants. If missing, all three.
//     For each channel in order:
//       1. If the priority is not "urgent" and the user does not allow it -> skip, reason "off".
//          (An urgent job, like an OTP, ignores the user's channel choice.)
//       2. If eventId + userId + channel was seen before -> skip, reason "duplicate". This is the dedupe key.
//       3. push with no device tokens -> skip, reason "no device".
//       4. Make one job per address. push: one job per token. email and sms: the address is the userId.
//          A job is { key, eventId, userId, channel, to, text, priority, tries: 0, waitMs: 0 }
//          and its key is "eventId:userId:channel:to", for example "evt77:sari:push:tA".
//       5. Not urgent, in quiet hours, and the channel is push or sms -> hold the job (status "held").
//          Email makes no sound, so it never waits for quiet hours. Otherwise put the job in its
//          channel queue (status "queued").
//     Bulk only: each user may get bulkPerDay bulk notifications. One notify call counts once.
//     When the user is at the limit, every channel is skipped with reason "limit".
//
//   release()
//     Quiet hours are over. Every held job goes into its queue and becomes "queued".
//
//   queueLength(channel) -> number of jobs waiting in that channel's queue
//
//   work(channel, send) -> null when the queue is empty, else { result, job }
//     Take the next job: urgent first, then normal, then bulk. Inside a priority, first in first out.
//     If this job's key already has status "sent" -> result "duplicate", do not call send.
//     Else add 1 to job.tries and call send(job). Then, by the code:
//       200               -> status "sent", result "sent"
//       429, 500 or 503   -> a short problem. If tries < maxTries: set job.waitMs = 1000 * 2 ** (tries - 1)
//                            (1000, 2000, 4000...), put the job at the back of its line, result "retry".
//                            Else it goes to the dead letters, status "failed", result "dead".
//       404 or 410        -> the token is dead. Remove job.to from the user's tokens.
//                            No retry, no dead letter. Status "failed", result "token removed".
//       anything else     -> a mistake in the request, for example 400. Retrying will not help.
//                            Dead letters at once, status "failed", result "dead".
//     A dead letter is the job plus reason: the last code, for example { ...job, reason: 503 }.
//
//   redeliver(job)
//     The queue hands the same job over again, like after a lost ack in lesson 06.
//     Put it at the back of its line, as it is.
//
//   status(key) -> "queued" | "held" | "sent" | "failed" | undefined
//
//   deadLetters() -> [dead jobs], oldest first
function createNotifier({ maxTries = 3, bulkPerDay = 2 } = {}) {
  // TODO
}

module.exports = { createNotifier };
