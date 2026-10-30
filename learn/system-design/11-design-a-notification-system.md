# 11. Design a notification system

> **Subject:** System Design · **Lesson:** 11 · **Made:** 2026-10-21 · **Remade in short cards:** 2026-10-30 · **Status:** ready
>
> **You will be able to:** draw how one event, "your loan is approved", reaches a user by push, email, SMS and in-app without slowing the request. You can also explain the dedupe key, retries, dead device tokens, and how a login code gets past a marketing blast.
>
> **Before this:** [Design a chat app](10-design-a-chat-app.md) · **Next:** [Design an online shop checkout](12-design-an-online-shop-checkout.md)
>
> **How to read it:** one card is one idea. Look at the picture, guess, then press the orange bar to check. The blue bars (📖 More detail) hold the longer explanation. Skip them on the first read, and open them when you want more. About 15 minutes for the cards.

## 1. The idea: drop an event, and go back to work

A service drops a short note that says "this happened" (an **event**) and goes back to work. A notification service checks the event and makes one job per **channel** (push, email, SMS, or in-app). Workers send the jobs, retry short problems, and never send twice. Like the mail room of a bank: departments drop letters in the tray and do not walk to the post office.

```mermaid
graph TB
    L["Loan service<br/>drops an event and moves on"] --> N["Notification service<br/>dedupe, preferences,<br/>quiet hours, limits"]
    N --> Q["One queue per channel<br/>push, email, SMS"]
    Q --> W["Workers send<br/>and retry short problems"]
    W --> P["Providers<br/>Apple, Google, email, SMS"]
```

<details class="guess"><summary>🤔 Guess: the loan service sends the push, the email and the SMS itself, and the SMS company is down. What happens to the "approve" button? Press to check.</summary>

It **waits for every provider**, then times out. The approve fails, or the SMS is lost. The officer clicks again, and Sari gets two pushes. Drop an event instead, and everything after that happens later.

</details>

> **Remember:** the first service drops an event and goes back to work. A provider that is down only delays the notification.

<details class="more"><summary>📖 More detail: new words, the big picture, the problems drawn, the mail room, and why it exists</summary>

A service drops a short note that says "this happened" (an **event**) and goes back to work. A notification service checks the event and makes one job per way to reach the user. Workers send the jobs, retry short problems, and never send twice.

Unlike lesson 10, one event goes to many outside companies. Each can be slow, down, or say "this phone is gone".

The hard parts: do not make the first service wait. Do not send twice. Respect the user's wishes, like no sounds at night (**quiet hours**). Let a one time login code (an **OTP**) go first.

New words (four):

- **Channel:** one way to reach a person: push, email, SMS, or in-app (a row in the app's inbox).
- **Provider:** the outside company that delivers on a channel, like Apple and Google for push.
- **Dedupe key:** a short text that names one notification, like `evt77:sari:push`. A key seen before means "do not send again". (Interview word: idempotency key.)
- **Device token:** the address of one app on one phone. Apple or Google gives it to the app. One user can have several.

From earlier lessons:

- Workers take jobs from a queue. A job can arrive twice (at least once). After too many failed tries, it goes to the dead letter queue for a person (lesson 06).
- A unique key in the database stops a second copy (lesson 08).
- A limit per user stops floods (lesson 09).

A provider answers each send with a number:

| Answer | Meaning |
|---|---|
| 200 | Yes, done |
| 429, 500 or 503 | Busy or broken for now. Try again later |
| 404 or 410 | This phone is gone |
| 400 | Your request is wrong |

**The big picture.** Notice: the loan service only drops an event, and everything after the notification service happens later.

```mermaid
graph LR
    LOAN["Loan service"] -->|loan approved event| NS["Notification service<br/>dedupe and preferences<br/>quiet hours and limits"]
    LOGIN["Login service"] -->|OTP event| NS
    NS -->|reads| PREF["Preferences and<br/>device tokens"]
    NS -->|one row per job| DB["Notifications table"]
    NS -->|in-app| INBOX["Inbox table"]
    NS --> QP["Push queue"]
    NS --> QE["Email queue"]
    NS --> QS["SMS queue"]
    QP --> WP["Push worker"] --> APNS["Apple and Google"]
    QE --> WE["Email worker"] --> EM["Email provider"]
    QS --> WS["SMS worker"] --> SMS["SMS provider"]
    WP -->|out of tries| DLQ["Dead letter queue"]
```

Each channel has its own queue. A slow SMS company cannot hold up push.

**The problem, drawn.** Notice: when the request sends everything itself, the approve button waits for every provider.

Notice: when the request sends everything itself, the approve button waits for every provider.

```mermaid
graph LR
    A["Approve loan L-42"] -->|waits 2 s| P["Apple push"]
    A -->|waits 1 s| E["Email provider"]
    A -->|times out| S["SMS provider is down"]
    S --> X["Approve fails or<br/>the SMS is lost"]
    A --> R["The officer clicks again<br/>so Sari gets two pushes"]
    classDef bad fill:#fde2e2,stroke:#c0392b,color:#000
    class S,X,R bad
```

A marketing blast is one message sent to millions of users. Notice: in one shared line, the login code waits behind the blast.

```mermaid
graph LR
    C["Marketing blast<br/>5 million jobs"] --> Q["One shared line"]
    O["Sari's login code"] --> Q
    Q --> W["Workers send 8,300 a second"]
    W --> L["The code arrives after<br/>about 10 minutes"]
    classDef bad fill:#fde2e2,stroke:#c0392b,color:#000
    class L bad
```

**The mail room in full.**

The mail room of a bank.

| In the mail room | In the system |
|---|---|
| Departments drop letters in the tray and go back to work. They do not walk to the post office | Events |
| Each customer has a card: "email yes, phone calls no, nothing after 10 pm" | Preferences |
| A log book line: "letter 77 to Sari by email, done". If letter 77 comes again, the clerk throws it away | The dedupe key |
| One tray per courier, with a red folder on top for urgent letters | Channel queues and lanes |
| The courier is busy, so the clerk tries again in one minute, then in two | Retries |
| After three tries, the letter goes on a "problem" shelf for a person | The dead letter queue |
| A letter comes back "moved". The clerk crosses out the old address for good | Device token cleanup |

Where the analogy stops: a mail room handles a few hundred letters a day. A blast is 5 million in 10 minutes. Providers answer in milliseconds, and a "moved" note may never come back.

**Why it exists and what it costs.**

- **Problem without it:** the first service waits for every provider. It fails when one is down and sends twice on a retry.
- **How it solves it:** one service runs the checks. Each channel gets a queue with priority lanes. Workers retry short problems, then give up into the dead letter queue.
- **Cost or tradeoff:** more parts and a short delay. You must catch duplicates yourself.

</details>

## 2. Never send twice: the dedupe key

The loan service misses the "accepted" reply and sends the event again. With at least once delivery this is normal. A **dedupe key** is a short text that names one notification, like `evt77:sari:push` (event, user, channel). The table has a unique rule on it, so it refuses the second copy. The key comes from the event id, not the time, and it goes in **after** the provider says 200.

```mermaid
graph TB
    A["evt77 arrives<br/>insert key evt77:sari:push"] --> B["New key: send the push"]
    B --> C["evt77 arrives again<br/>after a timeout"]
    C --> D["Key already exists<br/>skip and answer accepted"]
```

<details class="guess"><summary>🤔 Guess: the key is the event id plus the time it arrived. The same event arrives twice. Does the dedupe work? Press to check.</summary>

**No.** The times differ, so there are two keys, and Sari gets two pushes. The key must come from the event id, so the same event always makes the same key.

</details>

> **Remember:** a key seen before means "do not send again". Put the key in after the 200.

<details class="more"><summary>📖 More detail: right against wrong, the code, the real output, and step by step</summary>

**Right against wrong.**

The loan service misses the "accepted" reply and sends the event again. With at least once, this is normal.

Wrong. Notice: Sari gets the same push twice.

```mermaid
sequenceDiagram
    participant L as Loan service
    participant N as Notification service
    participant S as Sari phone
    L->>N: evt77 loan approved
    N->>S: push
    L->>N: evt77 again after a timeout
    N->>S: push again
    Note over S: Two identical pushes and Sari thinks something is wrong
```

Right. Notice: the table refuses the second copy of the key.

```mermaid
sequenceDiagram
    participant L as Loan service
    participant N as Notification service
    participant D as Notifications table
    participant S as Sari phone
    L->>N: evt77 loan approved
    N->>D: insert key evt77 sari push
    N->>S: push
    L->>N: evt77 again after a timeout
    N->>D: insert key evt77 sari push
    D-->>N: key already exists
    Note over N: skip and answer accepted
```

The key comes from the event id, not the time. So the same event always makes the same key.

**The smallest code that shows it.** One event, three channels, a dedupe set, and a push provider that fails once. Then the same event arrives again.

```js
const sent = new Set();                                  // dedupe keys already sent
const allowed = ["push", "email"];                       // Sari turned SMS off
let pushFailsLeft = 1;                                   // the push provider fails once
for (const eventId of ["evt77", "evt77"]) {              // loan L-42 approved, then the same event again
  for (const ch of ["push", "email", "sms"]) {
    const key = `${eventId}:sari:${ch}`;                 // the dedupe key
    if (!allowed.includes(ch)) { console.log(key, "off"); continue; }
    if (sent.has(key)) { console.log(key, "already sent, skip"); continue; }
    for (let t = 1; t <= 3 && !sent.has(key); t++) {     // up to 3 tries
      const code = ch === "push" && pushFailsLeft-- > 0 ? 503 : 200;   // the provider answers
      console.log(key, "try", t, code);
      if (code === 200) sent.add(key);
    }
  }
}
```

**Output:**

```
evt77:sari:push try 1 503
evt77:sari:push try 2 200
evt77:sari:email try 1 200
evt77:sari:sms off
evt77:sari:push already sent, skip
evt77:sari:email already sent, skip
evt77:sari:sms off
```

Checked on 2026-10-21 with Node 24.

Run again on 2026-10-30 with Node 26.12.1: the same output.

**What really happens, step by step.**

One row is one thing the code does. Watch the `sent` set and what Sari sees.

| Step | Code | What happens | `sent` after | Sari sees |
|---|---|---|---|---|
| 1 | first `evt77`, `ch = "push"` | The code builds `evt77:sari:push`. Push is on, and the key is new | empty | nothing |
| 2 | push, try 1 | The provider answers 503, busy. The code adds no key, so the loop tries again | empty | nothing |
| 3 | push, try 2 | The provider answers 200. The code adds the key | push | one push |
| 4 | `ch = "email"` | New key. Try 1 answers 200 | push, email | push, email |
| 5 | `ch = "sms"` | Sari turned SMS off. The code skips it and makes no call | push, email | push, email |
| 6 | second `evt77`, push | `evt77:sari:push` is already in `sent`. The code skips it | push, email | push, email |
| 7 | email | Already sent. Skipped | push, email | push, email |
| 8 | sms | Still off | push, email | push, email |

What to see:

- Step 2: the failure never reaches the loan service. The push is only late.
- Step 3: the key goes in **after** the 200. If it went in first, a failed push would look done.
- Steps 6 and 7: the second copy costs nothing. Same event, same key.

**Step through it yourself:** [open the stepper](visuals/11-design-a-notification-system.html). Story 1 is this trace. Story 2 shows a login code jumping the line, a dead token, and a dead letter. Guess first, then press Next.

</details>

## 3. Retries: what to do with each answer

A provider answers each send with a number. Only a short problem is worth a retry.

| Answer | What the worker does |
|---|---|
| 200 | Mark it sent |
| 429, 500, 503 | Busy for now. Wait 1 s, then 2 s, then 4 s, and go to the back of the line. After too many tries, the dead letter queue |
| 404, 410 | The phone is gone. Delete the device token and never retry |
| 400 | Our request is wrong. Dead letter queue now |

<details class="guess"><summary>🤔 Guess: a token gets a 410, and the worker retries it every time a notification comes. What goes wrong? Press to check.</summary>

A dead token **never comes back**, so every retry wastes a call. With a million dead tokens, that is a million useless calls each time. Apple may also drop your connection if you keep making errors. Delete the token on the first 404 or 410.

</details>

> **Remember:** only a short problem is worth a retry. A dead token is deleted.

<details class="more"><summary>📖 More detail: one failed try over time, and what to do with each answer drawn</summary>

**How it works over time: one failed try, one retry.** Notice: the loan service is done after one step, and the 503 only makes the push one second late.

Notice: the loan service is done after one step, and the 503 only makes the push one second late.

```mermaid
sequenceDiagram
    participant L as Loan service
    participant N as Notification service
    participant Q as Push queue
    participant W as Push worker
    participant A as Apple push
    participant S as Sari phone
    L->>N: event evt77 loan L-42 approved
    N-->>L: accepted
    N->>N: key evt77 sari push is new and push is on
    N->>Q: job for token tA with status queued
    W->>Q: take the next job
    W->>A: send try 1
    A-->>W: 503 busy
    Note over W: wait 1 s and put the job at the back
    W->>A: send try 2
    A-->>W: 200 accepted
    W->>N: status sent
    A->>S: shows Your loan L-42 is approved
```

**What to do with each answer.** Notice: only a short problem is worth a retry.

Notice: only a short problem is worth a retry.

```mermaid
graph TB
    R["The provider answers"] -->|200| OK["Mark sent"]
    R -->|429 or 500 or 503| T["Tries left?"]
    T -->|yes| WAIT["Wait 1 s then 2 s then 4 s<br/>and go to the back of the line"]
    T -->|no| DLQ["Dead letter queue<br/>and an alert"]
    R -->|404 or 410| DEL["The phone is gone<br/>delete the token and never retry"]
    R -->|400| BAD["Our request is wrong<br/>dead letter queue now"]
```

A dead token never comes back. Retrying it only wastes calls.

</details>

## 4. Priority lanes: a login code gets past a blast

A **lane** is a separate line inside one queue, one for each priority. The worker always looks at the urgent lane first. Urgent jobs also skip quiet hours, because nobody waits until 7 am for a login code.

| Lane | Example | The worker takes it |
|---|---|---|
| urgent | a login code (an OTP) | first |
| normal | loan approved | second |
| bulk | a marketing blast | last |

<details class="guess"><summary>🤔 Guess: a marketing blast of 5 million jobs, and workers send 8,300 a second, all in one shared line. How long does a login code wait behind it? Press to check.</summary>

About **10 minutes** (5,000,000 divided by 8,300 is about 600 seconds). By then the user has given up. The blast is 8,300 a second, 40 times normal, and that is why there are lanes.

</details>

> **Remember:** a blast must never block a login code. Give the urgent lane its own priority.

<details class="more"><summary>📖 More detail: the lanes drawn, what is in memory, and the numbers</summary>

**Priority lanes.** Notice: the worker always looks at the urgent lane first.

Notice: the worker always looks at the urgent lane first.

```mermaid
graph LR
    OTP["Login code"] -->|urgent| U["Urgent lane"]
    LA["Loan approved"] -->|normal| N["Normal lane"]
    MK["Marketing blast"] -->|bulk| B["Bulk lane"]
    U --> W["SMS worker<br/>urgent then normal then bulk"]
    N --> W
    B --> W
    W --> P["SMS provider"]
```

Urgent jobs also skip quiet hours and channel choices. Nobody waits until 7 am for a login code.

**What is in memory right now.**

A **lane** is a separate line inside one queue, one for each priority. Notice: this is one moment after the event, and every job row has a status.

```mermaid
graph TB
    subgraph P["Sari's preferences"]
        P1["push on - email on - SMS off"]
        P2["quiet hours 22 to 7 - now 14"]
    end
    subgraph T["Device tokens"]
        T1["tA - Sari's phone"]
        T2["tB - old tablet - app deleted"]
    end
    subgraph N["Notifications table"]
        N1["evt77:sari:push:tA - sent"]
        N2["evt77:sari:push:tB - failed 410"]
        N3["evt77:sari:email:sari - queued"]
    end
    subgraph Q["Email queue lanes"]
        Q1["urgent - empty"]
        Q2["normal - evt77 for sari"]
        Q3["bulk - 3 promo jobs"]
    end
```

| Status | Meaning |
|---|---|
| queued | Waiting in the queue |
| held | Waiting for quiet hours to end |
| sent | The provider said yes |
| failed | The send did not work. `tB` got 410, so the worker deletes it |

**The numbers.**

Rough guesses. Say them out loud.

| Question | The math | Answer |
|---|---|---|
| Notifications a day | 10 million users times 2 | 20 million |
| Per second | 20 million divided by 100,000 seconds | 200 |
| At the busiest time | 200 times 3 | 600 a second |
| A marketing blast | 5 million users in 10 minutes, 5,000,000 divided by 600 | about 8,300 a second |
| A login code stuck behind the blast in one line | 5 million jobs at 8,300 a second | about 10 minutes |
| Storage | 20 million rows times 500 bytes | 10 GB a day, about 900 GB for 90 days |
| Device tokens | about 1.5 phones or tablets per user | about 15 million |

The blast is the key number: **8,300 a second, 40 times normal**. That is why there are lanes.

</details>

## 5. Four channels, and what it costs

Each channel has its own queue, so a slow SMS company cannot hold up push. Each user has preferences (push on, SMS off, quiet hours 22 to 7) and may have several **device tokens**, the address of one app on one phone.

| Channel | Watch out |
|---|---|
| **Push** | Fast and free, but Apple and Google may drop or merge messages |
| **Email** | Marketing mail needs a one click unsubscribe |
| **SMS** | Costs money for every message, and is a favorite target for fraud |
| **In-app** | A row in your own inbox table. Sari only sees it when she opens the app |

<details class="guess"><summary>🤔 Guess: SMS reaches any phone. Why not send everything by SMS? Press to check.</summary>

It **costs money for every message**, and fraud likes it. Use push first (fast and free), email for long text, and SMS when you must reach a phone without the app.

</details>

> **Remember:** the costs are duplicates, retries that make it worse, dead letters that need a person, stale tokens, quiet hours, and too many messages.

<details class="more"><summary>📖 More detail: the four channels in full, and the cost table</summary>

**Four channels.**

| Channel | Good for | Watch out |
|---|---|---|
| **Push** | Fast and free. "Your loan is approved" | Needs a device token. Apple and Google try their best, but they may drop or merge messages |
| **Email** | Long text and documents. Never makes a sound | Spam rules. Marketing mail needs a one click unsubscribe |
| **SMS** | Reaches any phone, even without the app | Costs money for every message. A favorite target for fraud |
| **In-app** | A row in your own inbox table. No provider | Sari only sees it when she opens the app |

**What it costs.**

| Cost | What it means | What you do |
|---|---|---|
| Duplicates | Queues deliver at least once, and services resend after a timeout | The dedupe key with a unique key in the database. The worker skips a job that is already sent |
| Retries can make it worse | 8,300 jobs retry at the same moment and hit a sick provider again | Doubling waits with a little randomness, a cap on tries, and wait as long as the provider asks (`Retry-After`) |
| Dead letters need a person | A job in the dead letter queue is a user who got nothing | An alert on its size. A button to send the jobs again after the fix |
| Tokens go stale | Users delete the app or get a new phone | Delete on 404 or 410. Drop tokens not seen for a month |
| Quiet hours | Push and SMS wait until morning | A job that releases held rows at the end of each user's quiet hours |
| Too many messages | Users turn everything off, or uninstall | A limit per user per day for bulk |

</details>

## 6. Three mistakes, and what to say if you freeze

- **Wrong:** send inside the request. **Right:** publish an event and return.
- **Wrong:** retry every failure, at once, forever. **Right:** retry only 429, 500 and 503, with growing waits and a cap.
- **Wrong:** one queue for everything. **Right:** lanes per priority.

<details class="guess"><summary>🤔 Guess: "The queue gives each job to one worker, so there are no duplicates." True? Press to check.</summary>

**No.** The queue delivers at least once. A worker can crash after the send but before it tells the queue "done", and the queue hands the job out again. The dedupe key, `eventId:userId:channel`, with a unique key in the database, makes a second copy harmless.

</details>

> **Remember:** if you freeze, say "Services drop an event. The notification service checks it and queues one job per channel."

<details class="more"><summary>📖 More detail: the three mistakes in full, and the freeze plan</summary>

**Wrong:** send inside the request.

```js
// sketch, not run here
app.post("/loans/:id/approve", async (req, res) => {
  await db.loans.approve(req.params.id);
  await apns.send(token, "Your loan is approved");      // waits for Apple
  await sms.send(phone, "Your loan is approved");       // if this throws, the approve looks failed
  res.json({ ok: true });
});
```

**Right:**

```js
// sketch, not run here
app.post("/loans/:id/approve", async (req, res) => {
  await db.loans.approve(req.params.id);
  await events.publish({ eventId: `loan-approved-${req.params.id}`, userId, type: "loan_approved" });
  res.json({ ok: true });                               // the notification service does the rest
});
```

**Why:** the approve finishes in milliseconds. A provider that is down only delays the notification. The event id comes from the loan, so a resend builds the same dedupe key.

| Wrong | Right | Why |
|---|---|---|
| Retry every failure, at once, forever | Retry only 429, 500 and 503, with growing waits and a cap. Then the dead letter queue. On 404 or 410, delete the token. On 400, dead letter queue at once | A dead token never comes back, so retrying only wastes calls. Practice B shows it |
| "The queue gives each job to one worker, so there are no duplicates" | "The queue delivers at least once. The dedupe key, `eventId:userId:channel`, with a unique key in the database, makes a second copy harmless" | A worker can crash after the send but before it tells the queue "done". The queue hands the job out again (lesson 06) |
| "One queue for everything, ordered by time" | "Lanes or separate queues per priority, with their own workers" | A login code behind a blast waits 10 minutes, and the user gives up |

**If you freeze:**

1. "Services drop an event. The notification service checks it and queues one job per channel."
2. "Workers send. Busy answers get a retry, then the dead letter queue. A dead token gets deleted."
3. "The dedupe key is event, user and channel. Login codes use an urgent lane."

</details>

## 7. Watch and play

All links were checked on 2026-10-21. The video facts come from YouTube's own data. If one breaks, say so.

- **Video:** [Design a Notification Service (OneSignal) | Systems Design Questions 3.0 With Ex-Google SWE](https://www.youtube.com/watch?v=IScGMqojqKE), Jordan has no life, 11 min 33 s. Compare it with cards 1 and 4.
- **Play with it:** [the stepper in this folder](visuals/11-design-a-notification-system.html). Guess first. Try both tabs.
- **Read:** [Hello Interview: Design a Notification System](https://www.hellointerview.com/learn/system-design/problem-breakdowns/notification-system). The full interview answer.
- **Read:** [ByteByteGo: How Does a Typical Push Notification System Work?](https://bytebytego.com/guides/how-does-a-typical-push-notification-system-work/). One picture of the whole path.

<details><summary>Go deeper (optional)</summary>

**More about the links above.** The video is a short whiteboard design. In Hello Interview, find the parts on never losing a message, priority during a blast, and idempotency. The ByteByteGo picture goes from the event to Apple and Google.

**Another thing to play with.** [Resilience patterns](https://system-design.space/en/visuals/resilience-patterns/) on System Design Space. Change the load and the scenario. Watch retries and a circuit breaker, a switch that stops calls, protect a sick service.

**Provider pages.**

- [Firebase: Best practices for FCM registration management](https://firebase.google.com/docs/cloud-messaging/manage-tokens): when a token is stale, and why to delete it on `UNREGISTERED`.
- [Apple: Handling notification responses from APNs](https://developer.apple.com/documentation/usernotifications/handling-notification-responses-from-apns): every answer Apple can give, and which ones you must not retry.

**What Apple's answers mean.** Apple's page says 410 means "The device token is no longer active for the topic", with reasons like `Unregistered` and `ExpiredToken`, and that "410 isn't considered an error condition". 429 `TooManyRequests` means too many requests to the same token. Apple lists answers you must not retry, among them `BadDeviceToken`, `Unregistered`, `ExpiredToken` and `PayloadTooLarge`. Answers like 429 and 5xx can be retried with a delay.

**What Google's answers mean.** The [FCM error codes](https://firebase.google.com/docs/cloud-messaging/error-codes) page says to retry `UNAVAILABLE` (503), `INTERNAL` (500) and `QUOTA_EXCEEDED` (429) with growing waits, and to "Honor the Retry-After header". Do not retry `UNREGISTERED` (404) or `INVALID_ARGUMENT` (400). The token page calls a token stale when the device has "not connected to FCM for over a month", and suggests the app refreshes its token about once a month.

**The 400 in the practice is simplified.** In real life, a 400 comes with a reason. If the reason is about the token, `BadDeviceToken` from Apple or `INVALID_ARGUMENT` from Google, delete the token too. If it is about the message, like a payload over Apple's 4 KB limit, fix the code.

**The crash between send and ack.** The worker sends, then crashes before it writes "sent". The queue hands the job out again, and the worker cannot know the push went out. Your own dedupe cannot fully close this gap. Apple's [sending requests](https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns) page has an `apns-collapse-id` header: "When sending the same notification more than once, use the same value in this header to merge the requests". Use the dedupe key there.

**Apple stores, but only a little.** If the phone is off, Apple keeps a notification for up to 30 days, depending on `apns-expiration`. It keeps only one per app, usually the latest. So push is never your record of what you told the user. The notifications table or the in-app inbox is.

**Priority at the provider too.** Apple's `apns-priority` 10 means send now, and 5 means when it suits the phone's battery. Google's [Android message priority](https://firebase.google.com/docs/cloud-messaging/android-message-priority) page says high priority can wake a sleeping phone, but "If FCM detects a pattern in which messages don't result in user-facing notifications, your messages may be deprioritized." Do not mark marketing as high.

**Email rules for bulk senders.** Google's [sender guidelines FAQ](https://support.google.com/mail/answer/14229414?hl=en) treats senders of about 5,000 messages a day to Gmail as bulk senders. They need a one click unsubscribe and must keep the spam rate below 0.3%. Messages like a password reset do not need the unsubscribe link.

**Delivery status from webhooks.** Email and SMS providers call you back with "delivered", "bounced" or "opened". These calls can come twice, out of order, or never. Only move a status forward, and treat them as hints. The walkthrough Part 3 covers this.

**Other videos and reads.**

- [19: Notification Service | Systems Design Interview Questions With Ex-Google SWE](https://www.youtube.com/watch?v=J-5JozlYIqI), Jordan has no life, about 21 min. The older, longer version.
- [How to build a Notification System Design EXPLAINED | Ace your System Design Interview - Gourav](https://www.youtube.com/watch?v=6RKYu6eZIPg), Code with GD, about 18 min.
- [AlgoMaster: Design Notification Service](https://algomaster.io/learn/system-design-interviews/design-notification-service), a long written answer.

**Checked on:** 2026-10-21.

</details>

## 8. Practice

**A. Predict the output** (write your answer before opening)

Sari's quiet hours are 22 to 7. The second line prints the wait before each retry.

```js
const quiet = (h, start, end) => (start <= end ? h >= start && h < end : h >= start || h < end);
console.log([21, 22, 23, 3, 7].map((h) => (quiet(h, 22, 7) ? "hold" : "send")).join(" "));
const waits = [1, 2, 3].map((tries) => 1000 * 2 ** (tries - 1));
console.log(waits.join(" "));
```

Then answer: at 23:00 a push and an email for Sari arrive. Which one goes now?

<details><summary>Answer</summary>

```
send hold hold hold send
1000 2000 4000
```

22 to 7 crosses midnight, so "quiet" means 22 or later, **or** before 7. 21 is before the start. 7 is the end, and the end is not included, so 7 sends. The waits double: 1 s, 2 s, 4 s. (Checked on 2026-10-21 with Node 24.)

The email goes now. It makes no sound, so quiet hours do not hold it. The push waits until 7.

</details>

**B. Fix the bug**

Sari has two tokens. `tB` is her old tablet, where she deleted the app. Run it in your head, then fix it.

```js
const tokens = ["tA", "tB"];                                // tB is Sari's old tablet. The app was deleted
const apns = (token) => (token === "tB" ? 410 : 200);
const outbox = ["tA", "tB"];                                 // one push job per token
let calls = 0;
while (outbox.length && calls < 6) {
  const token = outbox.shift();
  const code = apns(token); calls++;
  console.log(token, code);
  if (code !== 200) outbox.push(token);                     // retry every failure
}
console.log("calls:", calls, "tokens:", tokens.join(" "));
```

<details><summary>Answer</summary>

It prints:

```
tA 200
tB 410
tB 410
tB 410
tB 410
tB 410
calls: 6 tokens: tA tB
```

410 means the app is gone from that device. It will never work, but the code retries it until the safety stop at 6 calls, and the dead token is still there for the next notification. With a million dead tokens, that is a million useless calls every time.

Fix: change `const tokens` to `let tokens`, and change the last line in the loop:

```js
  if (code === 410 || code === 404) tokens = tokens.filter((t) => t !== token);   // the phone is gone: delete, never retry
  else if (code !== 200) outbox.push(token);                                     // a short problem: try again later
```

It now prints:

```
tA 200
tB 410
calls: 2 tokens: tA
```

(Both outputs checked on 2026-10-21 with Node 24.)

</details>

**C. Write it yourself**

Open `learn/system-design/practice/11-design-a-notification-system.js` and write `createNotifier`. The comment at the top explains every rule. Run this from the repo root until all tests pass:

```
node --test learn/system-design/practice/11-design-a-notification-system.test.js
```

<details><summary>Go deeper (optional): what the two main functions do</summary>

`createNotifier` plays the notification service, the queues and the workers. `notify` runs the checks: channel choices, the dedupe key, no device, the bulk limit and quiet hours. Then it makes one job per address. `work` takes the next job, urgent first, and calls the provider function you give it. It decides by the code: sent, retry with a doubling wait, token removed, or dead letter.

</details>

<details><summary>One possible answer</summary>

```js
function createNotifier({ maxTries = 3, bulkPerDay = 2 } = {}) {
  const CHANNELS = ["push", "email", "sms"];
  const LANES = ["urgent", "normal", "bulk"];
  const prefs = new Map();                                    // userId -> { channels, quietStart, quietEnd }
  const tokens = new Map();                                   // userId -> [device tokens]
  const seen = new Set();                                     // dedupe keys "eventId:userId:channel"
  const statuses = new Map();                                 // job key -> "queued" | "held" | "sent" | "failed"
  const bulkCount = new Map();                                // userId -> bulk notifications today
  const queues = {};                                          // channel -> { urgent: [], normal: [], bulk: [] }
  for (const ch of CHANNELS) queues[ch] = { urgent: [], normal: [], bulk: [] };
  let held = [];
  const dead = [];

  const prefsOf = (userId) => prefs.get(userId) || { channels: ["push", "email"] };
  const isQuiet = ({ quietStart: s, quietEnd: e }, hour) => {
    if (s === undefined || e === undefined) return false;
    return s <= e ? hour >= s && hour < e : hour >= s || hour < e;   // the second form crosses midnight
  };
  const enqueue = (job) => { queues[job.channel][job.priority].push(job); statuses.set(job.key, "queued"); };

  return {
    setPrefs(userId, p) { prefs.set(userId, p); },
    addToken(userId, token) { tokens.set(userId, [...(tokens.get(userId) || []), token]); },
    tokensOf: (userId) => [...(tokens.get(userId) || [])],

    notify({ eventId, userId, text, hour, priority = "normal", channels = CHANNELS }) {
      const out = { queued: [], held: [], skipped: [] };
      const p = prefsOf(userId);
      const urgent = priority === "urgent";
      const atLimit = priority === "bulk" && (bulkCount.get(userId) || 0) >= bulkPerDay;
      let made = false;
      for (const channel of CHANNELS.filter((c) => channels.includes(c))) {
        if (!urgent && !p.channels.includes(channel)) { out.skipped.push({ channel, reason: "off" }); continue; }
        const dedupeKey = `${eventId}:${userId}:${channel}`;
        if (seen.has(dedupeKey)) { out.skipped.push({ channel, reason: "duplicate" }); continue; }
        if (atLimit) { out.skipped.push({ channel, reason: "limit" }); continue; }
        const addresses = channel === "push" ? tokens.get(userId) || [] : [userId];
        if (addresses.length === 0) { out.skipped.push({ channel, reason: "no device" }); continue; }
        seen.add(dedupeKey);
        made = true;
        const wait = !urgent && channel !== "email" && isQuiet(p, hour);   // email makes no sound
        for (const to of addresses) {
          const job = { key: `${dedupeKey}:${to}`, eventId, userId, channel, to, text, priority, tries: 0, waitMs: 0 };
          if (wait) { held.push(job); statuses.set(job.key, "held"); out.held.push(job.key); }
          else { enqueue(job); out.queued.push(job.key); }
        }
      }
      if (made && priority === "bulk") bulkCount.set(userId, (bulkCount.get(userId) || 0) + 1);
      return out;
    },

    release() { held.forEach(enqueue); held = []; },
    queueLength: (channel) => LANES.reduce((n, lane) => n + queues[channel][lane].length, 0),

    work(channel, send) {
      const lane = LANES.find((l) => queues[channel][l].length > 0);
      if (!lane) return null;
      const job = queues[channel][lane].shift();
      if (statuses.get(job.key) === "sent") return { result: "duplicate", job };   // already sent: never twice
      job.tries += 1;
      const code = send(job);
      if (code === 200) { statuses.set(job.key, "sent"); return { result: "sent", job }; }
      if ([429, 500, 503].includes(code) && job.tries < maxTries) {
        job.waitMs = 1000 * 2 ** (job.tries - 1);             // 1 s, 2 s, 4 s...
        queues[channel][lane].push(job);                       // back of the line, so others keep moving
        return { result: "retry", job };
      }
      statuses.set(job.key, "failed");
      if (code === 404 || code === 410) {                      // the phone is gone: clean up, never retry
        tokens.set(job.userId, (tokens.get(job.userId) || []).filter((t) => t !== job.to));
        return { result: "token removed", job };
      }
      dead.push({ ...job, reason: code });                     // out of tries, or a bad request
      return { result: "dead", job };
    },

    redeliver(job) { queues[job.channel][job.priority].push(job); },
    status: (key) => statuses.get(key),
    deadLetters: () => dead.map((j) => ({ ...j })),
  };
}

module.exports = { createNotifier };
```

Checked on 2026-10-21 with Node 24: the 24 tests fail on the empty stub and all 24 pass with this answer. Two things to notice. The dedupe key is checked in `notify`, for a second copy of the event, **and** the status is checked in `work`, for a job the queue hands out twice. And `waitMs` is only recorded here. A real queue, like BullMQ with `attempts` and `backoff`, would hold the job for that long before a worker sees it again.

</details>

## 9. Interview question

**Q:** "Design a notification system for a banking app. It sends push, email, SMS and in-app messages: login codes, 'your loan is approved', and marketing. 10 million users."

A common follow-up: "The SMS provider is down for 20 minutes. What happens?" SMS jobs wait and retry. Push and email keep flowing. Jobs out of tries wait in the dead letter queue (card 3).

<details><summary>A strong answer, in four parts</summary>

1. **Problem:** one event must reach a user on the channels they allow, without blocking the service that made it, without double sends, respecting quiet hours, and with a daily limit on marketing. I estimate 20 million a day, about 200 a second, 600 at the busiest time. A blast to 5 million users in 10 minutes is about 8,300 a second. That is the driver: a login code must not wait behind it. First I ask: which channels? Is there an in-app inbox? How fast must a login code arrive?
2. **How it works:** services publish an event with a stable id. The notification service builds the dedupe key `eventId:userId:channel` and inserts it with a unique index, so a second copy is skipped. It reads preferences and device tokens, holds push and SMS during quiet hours, checks the bulk limit, fills the template, and writes one row per job with status `queued`. Each channel has its own queue with urgent, normal and bulk lanes, and its own workers. A worker calls the provider. 200 means `sent`. 429 and 5xx go back with a wait of 1 s, 2 s, 4 s plus a random spread, and after the last try into the dead letter queue with an alert. 404 or 410 deletes the token. Provider webhooks move the status on to `delivered`.
3. **Tradeoff:** the queue adds a short delay, and at least once means I own the dedupe. Separate lanes cost more workers but keep login codes fast during a blast. SMS reaches everyone but costs money per message, so I prefer push when the user has a token.
4. **My example:**
   - **Fact:** in DBO, the Auth service sends the login OTP by WhatsApp through Jatis.
   - **Fact:** DBO has a Queue service with BullMQ on Redis, and separate workers for email, points and webhooks. Emails already go through a queue, not inside the request.
   - **Idea, not a fact:** the DBO case study suggests a strict limit on OTP requests, for example 3 per phone number per hour, because each WhatsApp message costs money. That is a suggestion, not something we built.
   - **Idea, not a fact:** in a loan system like the ones I work on at Skyworx, "your loan is approved" would be a normal priority event with a dedupe key from the loan id, and the OTP would be urgent. I have no facts about how Skyworx or Unloan send notifications, so I do not claim any.

</details>

## 10. Explain it back

Close this file. Explain a notification system out loud to a new junior: problem, how, tradeoff, my example. Use Sari's loan L-42: a 503 and a retry, the event arriving twice, and her old tablet answering 410. Write your best version below. Then run `/explain-check design a notification system` or ask the `explain-coach` agent.

### My explanation

<write here>

### Coach feedback

<the explain-coach agent writes here>

## 11. Review questions (day 1, 3, 7, 21)

1. Walk "loan L-42 approved" from the loan service to Sari's phone. Name each part and each check.
2. What goes into the dedupe key? Why the event id and not the time? Where else must a worker check before it sends?
3. The provider answers 503, 410 and 400. What does the worker do for each, and why?
4. A blast of 5 million is running when Sari asks for a login code. Why does the code still arrive in seconds?

<details><summary>Answers</summary>

1. The loan service publishes an event with id `evt77` and moves on. The notification service builds `evt77:sari:push` and inserts it, so it is new. It reads Sari's preferences (push on, SMS off), checks quiet hours (14:00, not quiet), finds token `tA`, and writes a `queued` row. The job goes into the normal lane of the push queue. The push worker takes it, calls Apple, gets 200, and marks it `sent`. Apple shows it on the phone.
2. Event id, user id and channel. The same event always makes the same key, so a resend is caught. The time would be different on a resend, so it would not catch it. The worker also checks the job's status before sending, because the queue can hand out the same job twice after a lost ack.
3. 503: a short problem. Put it back with a wait that doubles, and after the last try move it to the dead letter queue. 410: the app is gone from that device. Delete the token and never retry. 400: our request is wrong, so a retry gives the same answer. Dead letter queue at once, so a person can fix the bug.
4. The code is urgent, so it goes into the urgent lane, and workers always empty that lane first. In one shared line it would wait about 10 minutes behind 5 million jobs at 8,300 a second. Urgent jobs also skip quiet hours and the user's channel choices.

</details>

## 12. Go deeper (optional)

Open these when you are ready. None of them is needed for the cards above.

<details><summary>Go deeper (optional)</summary>

- Apple's push service is called APNs. Google's is called FCM (Firebase Cloud Messaging).
- Google answers 404 for a dead token, and Apple answers 410.
- The app sends its device token to your server. An email company and an SMS company are the other providers.
- Lesson 10 ended with a push queue and a push worker. This lesson opens that box.

</details>

<details><summary>Go deeper (optional)</summary>

- **The row key in the memory picture (card 4).** Each job row uses the dedupe key plus the address, like `evt77:sari:push:tA`.
- **Later statuses.** After **sent**, a provider may tell you **delivered** or **opened**.
- **Why delete dead tokens fast.** Retrying a dead token forever wastes calls. Apple may also drop your connection if you keep making errors.

</details>

<details><summary>Go deeper (optional)</summary>

The code shows three ideas at once: preferences, the retry, and the dedupe key. In a real system, the `sent` set is a unique index on the dedupe key in the database. The retry does not loop in place. The worker puts the job back in the queue with a wait.

</details>

<details><summary>Go deeper (optional)</summary>

- In a real system, step 2 is not a quick loop. The worker puts the job at the back of the queue. It waits 1 s, then 2 s, so other jobs keep moving.
- Story 1 in the stepper: loan approved, a 503, a retry, and a second copy of the event that the dedupe key stops.
- Story 2 in the stepper: an urgent OTP jumps past three marketing SMS. A dead token is removed after one 410. A job runs out of tries and goes to the dead letter queue.

</details>

<details><summary>Go deeper (optional)</summary>

**The gap between save and publish.** If the server dies between the save and the publish, the event is lost. The fix is an outbox row written in the same transaction as the save. The walkthrough Part 3 shows it.

**"5xx" in interviews.** People say "5xx" for all the 500 answers, like 500 and 503. Retry them with growing waits.

**The longer freeze lines.** The checks are dedupe, preferences, quiet hours and limits. Busy means 429 and 5xx, with growing waits. Dead means 404 or 410. The dedupe key sits behind a unique index, and the urgent lane means a blast never blocks a login code.

</details>


## Connected lessons

- [Design a chat app](10-design-a-chat-app.md): its push worker is the push channel here.
- [Design an online shop checkout](12-design-an-online-shop-checkout.md): "your order is paid" is one more event.
- [Message queues](06-message-queues.md): at least once and the dead letter queue.
- [Design a URL shortener](08-design-a-url-shortener.md): the unique key.
- [Design a rate limiter](09-design-a-rate-limiter.md): limits per user.

<details><summary>Go deeper (optional): more connected lessons</summary>

- Design a chat app is the lesson before. Its push queue and push worker are the push channel here.
- Design an online shop checkout is the next lesson. "Your order is paid" is an event this system sends, and webhooks come back again.
- Message queues also covers growing waits. This lesson builds on it.
- The URL shortener's unique key makes a resend harmless.
- The rate limiter covers the limit per user for bulk, and the strict limit on OTP requests.
- [Idempotency and retries](13-idempotency-and-retries.md) - the dedupe key in depth.
- [Observability](14-observability.md) - queue depth per lane, dead letter size, and provider errors are the numbers to watch.
- [Streams vs queues](21-streams-vs-queues.md) - when the events themselves should live in Kafka.
- [Timeouts, retries and circuit breakers](23-timeouts-retries-and-circuit-breakers.md) - backoff with a random spread, and stopping calls to a provider that is down.
- [System design, step by step, Part 3](system-design-step-by-step-walkthrough.md) - the same problem as a full seven step answer, with the outbox and webhook reconciling.
- [Queues, streams and event-driven design](queues-streams-and-event-driven-design.md) - Part 4 on retries and dead letters, and Part 7 on rate limits toward third parties.
- [Design workbook part 1](design-workbook-part-1-classic-designs.md) and [part 2](design-workbook-part-2-correctness-designs.md) - more full designs that use the same queue and worker shape.
- [Frontend system design](frontend-system-design.md) - Part 6 shows push notifications from the phone's side.

</details>
