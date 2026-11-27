# TypeScript: what to know first

**Written:** 2026-11-27 · **For:** Software Engineer and Senior Software Engineer interviews · **Source:** lessons 01 to 04 of this folder (checked with `tsc` 7.0.2, 2026-11-27)

This page is a short map of what interviewers ask about TypeScript. You use it every day, so expect questions about *why*, not only *how*. Use these lines to explain what you already do.

**How to read the stars.** This is my judgement of how often each topic is asked.

- ★★★ Asked in almost every TypeScript interview.
- ★★ Often asked.
- ★ For depth.

## ★★★ Learn these first

| Topic | Say this in the interview | Common trap |
|---|---|---|
| Types vanish at run time ([lesson 01](01-why-typescript-and-how-it-compiles.md)) | The compiler checks types before the code runs, then removes them. The running program is plain JavaScript. | Thinking a type protects you from bad data. `JSON.parse` returns whatever was in the text, and `as User` checks nothing. |
| Check outside data at the border ([lesson 01](01-why-typescript-and-how-it-compiles.md)) | Data from `fetch`, JSON, storage or a form must be checked once, where it comes in. After that the type is true. | Saying "tsc passes, so it works". It only means the types agree with each other. |
| Narrowing and unions ([lesson 04](04-union-types-and-narrowing.md)) | A union is one of several types. A check (`typeof`, `in`, `===`, `Array.isArray`) makes it smaller inside that branch. | Truthiness is not "has a value": `0` and `""` are falsy. |
| Discriminated unions ([lesson 04](04-union-types-and-narrowing.md)) | Give each member a `kind` field with one exact word, `switch` on it, and put `assertNever` in the default. A new kind becomes a compile error. | Forgetting the default, so a new kind is silently ignored. |
| `type` vs `interface` ([lesson 03](03-type-vs-interface.md)) | Both describe object shapes and both vanish at run time. Only `type` can name a union, tuple or mapped type. Only `interface` merges. | Claiming they are very different. Most of the time pick one rule for the team. |

## ★★ Learn these second

| Topic | Say this in the interview |
|---|---|
| Inference ([lesson 02](02-basic-types-and-inference.md)) | The compiler works out the type from the first value. Write types on function parameters, empty arrays and objects. Let it infer the rest. |
| `let`, `const` and `as const` ([lesson 02](02-basic-types-and-inference.md)) | `const` keeps the exact value, `let` keeps the wide type. `as const` keeps exact values inside an object and makes them read-only. |
| `any` ([lesson 02](02-basic-types-and-inference.md)) | `any` switches checking off, so a wrong call compiles and crashes later. Prefer `unknown` and narrow it (lesson 07, planned). |
| Strict mode ([lesson 02](02-basic-types-and-inference.md)) | Strict mode is on by default since TypeScript 6.0. `undefined` is a type you must handle. |
| `extends` vs `&` ([lesson 03](03-type-vs-interface.md)) | `extends` shows a clash at the declaration. `&` hides it and turns the field into `never`. |
| `!` and `as` ([lesson 04](04-union-types-and-narrowing.md)) | They are promises from you, not checks. Use a real check so the compiler can help. |

## ★ For depth

- `tsc` can check, emit or both. `--noEmit` is check only. Make the build stop on type errors.
- TypeScript 7 is a native compiler. Node can run `.ts` files by removing types, but it does not check them.
- Generics, utility types, type guards, mapped and conditional types are planned lessons 05 to 11.

## The questions most likely to come up

1. "Do types exist at run time? How do you validate an API response?"
2. "`type` or `interface`? What is the difference?"
3. "What is a discriminated union, and how do you make a `switch` exhaustive?"
4. "`any` vs `unknown`?"
5. "What does strict mode do?"

## Honest notes

- Only lessons 01 to 04 exist. Generics, utility types and typing API data are the next ones, and they are asked a lot in senior rounds, so write them before an interview that needs them.
- TypeScript 7.0.2 was the latest on npm on 2026-11-27. The site's release notes pages stop at 6.0. Re-check the version if it matters.
- Use `/project-story` to prepare real stories about how you typed DBO, Unloan and ZWS. Do not invent details.
