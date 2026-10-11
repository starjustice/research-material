# How I Learn (read this before teaching me)

Every skill and agent in this folder reads this file first. It describes how I learn, so material fits me instead of a generic reader.

## Who I am

- Full stack engineer, 7+ years. JavaScript, TypeScript, React, Next.js, React Native, Express, GraphQL, Hasura, Prisma, PostgreSQL, a little Docker, CapRover and AWS.
- Real projects to connect concepts to: **DBO** (B2B commerce app, mobile app plus admin CMS, I led the team), **Unloan** (home loan platform for an Australian bank), **ZWS** (React Native store on Shopify with subscriptions), and now loan systems for Indonesian banks at Skyworx.
- Preparing for mid and senior interviews.

## My problems (what to fix)

1. **I remember words, not ideas.** I can repeat a definition but cannot say what happens step by step. Then I forget it in a week.
2. **I understand pictures much faster than text.** A wall of text does not stick.
3. **I cannot explain the why.** In interviews I fail theory questions (database, how things work inside) and questions about why I chose something in my projects.
4. **I freeze on code problems**, even simple ones like Fibonacci, because I start typing before I see the pattern.

## Rules for any material made for me

- **Picture first, and many pictures.** Every concept starts with a diagram, and one diagram is never enough. A lesson has at least five pictures: the big picture, the problem drawn, the mechanism over time, what sits in memory at one moment, and right against wrong. Text explains the pictures, not the other way round. If a paragraph could be a picture, make it a picture.
- **Let me move it.** For anything that runs in an engine (event loop, closures, scope, promises, how a query runs, how a request travels), also build a small page in `learn/<subject>/visuals/` where I press Next and watch each part change. Use a plain, self-contained HTML file.
- **One concept per file.** Small pieces I can finish in one sitting. Link to the next piece instead of growing the file.
- **Problem before solution.** Say what breaks without the thing, then the thing, then the cost.
- **Show the machine running.** For code: the smallest example, then a trace of what the engine does line by line (memory, call stack, queue, values).
- **Plain English.** Short sentences. Define every term the first time. No idioms. No em dashes.
- **Connect to my projects.** "Where did I use this?" with DBO, Unloan, ZWS or Skyworx, never invented facts about them.
- **Make me do something.** Predict the output before the answer. Fix a bug. Draw it. Answers are hidden in `<details>` so I try first.
- **Give me places to see it, not only read it.** A short video, an interactive visualizer (Loupe, Python Tutor, VisuAlgo, explain.dalibo.com, the TypeScript Playground), or a page with good diagrams. Every link must be checked to be real and working. Never invent a link.
- **End with explain it back.** A prompt for me to explain it in my own words, then `/explain-check` or the `explain-coach` agent checks it.
- **Spaced review.** Each lesson ends with 4 short review questions for day 1, 3, 7 and 21. Things I get wrong go to `my-learning/review-list.md`.

## How I want feedback

- Honest. Tell me what is wrong and why. Do not praise a vague answer.
- Point to the exact sentence that was vague or memorized, then show the better version in my own simple words.
- Draw the correct picture after I try, not before.
