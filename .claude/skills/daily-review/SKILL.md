---
name: daily-review
description: Run a short spaced-repetition review from the user's review list and solve log, mixing questions, redraw-from-memory and fill-the-diagram exercises. Use when the user says "daily review", "quiz me", "review time", "what should I review today", or "/daily-review". Takes an optional time budget in minutes.
argument-hint: [minutes: 10|20] [topic]
---

# Daily Review

The user forgets things they studied. The fix is not re-reading. It is being asked the question again after a gap: 1 day, 3 days, 7 days, 21 days. This skill runs that, in about 10 minutes.

## Setup (silent)

1. Read `notes/learning-log/review-list.md`. If it does not exist or is empty, say so in one line and offer to start from a topic (suggest `/explain-check <topic>`). Then stop.
2. Read `examples/problem-solving-practice/solve-log.md` if it has filled rows. Problems whose redo day 3 or day 7 is due go into today's list.
3. Get today's date from the system (not from memory).
4. Time budget: default 10 minutes, about 5 to 6 items. Use the argument if given.

## Pick today's items

From the review list, an item is **due** when its "Next review" date is today or earlier. Order: overdue first, then lowest streak, then older items. Add at most 2 items from the solve log redo list. If more are due than fit, say how many are left over.

If nothing is due, say "Nothing due today." Offer to review the weakest topic anyway.

## Run the review

Start with one line: how many items, roughly how long. Then go **one item at a time**. Ask, stop, wait.

Mix three styles so it does not get boring (the user learns best with visuals):

**Question.** Ask the review question as written. Ask for a short answer in their own words.

**Redraw.** "Draw how <thing> works on paper, or describe your drawing in words: the boxes and the arrows." After they answer, show the correct Mermaid diagram and ask them to compare with their drawing.

**Fill the diagram.** Give a Mermaid diagram or a simple text flow with 2 or 3 labels replaced by `???`. Ask them to fill the blanks.

**Code problems from the solve log.** Do not ask for code in chat. Say: "Redo `<problem>` from a blank file in `examples/problem-solving-practice/`, then tell me the pattern and the time and space cost." Wait for their report.

### After each answer
Judge: **correct** (right idea in their own words), **partly** (right direction, missing the reason or the tradeoff), or **missed**.

- Do not give the answer before they try. Never say "that is wrong" first. Ask them to say more, or ask a smaller question.
- Give a **one or two line correction** for partly and missed. Not a lecture.
- If they said something correct but only with big words, ask: "Say it again like I am a new junior."

Update the list as you go.

## Update the review list

For each item, edit its row in `notes/learning-log/review-list.md`:

| Result | Streak | Next review |
|---|---|---|
| Correct | +1 | streak 1: +3 days, streak 2: +7 days, streak 3: retire (move to the Retired section with the date) |
| Partly | stays the same | tomorrow |
| Missed | reset to 0 | tomorrow |

Set "Last result" to the date and result. If an item was partly or missed twice in a row, mark it with `(hard)` after the question and suggest `/explain-check` on that topic.

If the user answered something they could not answer before and it should be a new item, add it with streak 0 and next review tomorrow.

## End of the session

Give a short summary, five lines at most:
- How many correct, partly, missed
- The one topic that needs real study (not another quiz)
- What is due tomorrow (just the count)
- A streak note only if it is real, for example "3 days in a row". No fake cheering.
- If they missed the same item twice, say honestly that reviewing again will not fix it. It needs a proper `/explain-check`.

## Rules

1. **One item at a time.** Short messages.
2. **Test first, teach second.** The effort of trying is the learning.
3. **Be honest on grading.** A vague answer is "partly", not "correct".
4. **Keep it short.** This is a 10 minute habit, not a study session. Do not add new material.
5. **Never invent review items.** Only use what is in the list or the solve log, or what the user just failed.
6. **No em dashes** in anything you write for them.
7. Follow their language.
