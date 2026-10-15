# 02. Values, types and coercion

> **Subject:** JavaScript · **Lesson:** 02 · **Made:** 2026-10-15 · **Status:** ready
> **You will be able to:** say the difference between a simple value and an object, walk `[] == false` round by round, and list the 8 values that count as false.
> **Before this:** [Variables, scope and hoisting](01-variables-scope-and-hoisting.md) · **Next:** [Reference vs copy](03-reference-vs-copy.md)

## 1. The idea in one sentence

Every value in JavaScript has a **type**, and some signs, like `==`, `+` and `if`, quietly change a value into another type before they use it.

A **type** is the kind of value: a number, some text, `true` or `false`, and so on. `typeof` tells you the type name.

New words:

- **Simple value:** one plain value like `5`, `"2"` or `true`. It has no parts, and you cannot change it. (Interview word: *primitive*.)
- **Changing the type:** JavaScript turns a value into another type on its own. For example, the text `"2"` becomes the number `2`. (Interview word: *coercion*.)
- **Loose check and strict check:** `==` may change types before it compares. `===` never changes a type. (Interview words: *loose equality* and *strict equality*.)
- **Counts as true, counts as false:** what an `if` decides about a value that is not `true` or `false`. (Interview words: *truthy* and *falsy*.)

The rule to remember: **`===` never changes a type. `==` and `+` sometimes do. An `if` only asks: "is this one of the 8 values that count as false?"**

## 2. The pictures

### 2a. The big picture

Every value is either a simple value or an object. Notice that arrays and functions are objects too.

```mermaid
graph TB
    V["Every value in JavaScript"] --> P["Simple values, 7 kinds"]
    V --> O["Objects, values with parts"]
    P --> P1["number like 5 or 3.5"]
    P --> P2["string, which is text like hi"]
    P --> P3["boolean, which is true or false"]
    P --> P4["undefined, no value given yet"]
    P --> P5["null, empty on purpose"]
    P --> P6["bigint and symbol, rare"]
    O --> O1["plain object like a: 1"]
    O --> O2["array like 1, 2, 3"]
    O --> O3["function"]
```

`typeof` gives you the type name. It has two surprises, marked in bold.

| Code | `typeof` gives |
|---|---|
| `typeof 5` | `"number"` |
| `typeof "hi"` | `"string"` |
| `typeof true` | `"boolean"` |
| `typeof undefined` | `"undefined"` |
| `typeof null` | **`"object"`** (an old mistake that was never fixed) |
| `typeof {}` | `"object"` |
| `typeof []` | **`"object"`** (use `Array.isArray` to check for an array) |
| `typeof function () {}` | `"function"` |

### 2b. The problem, drawn

A form field always gives you **text**, even when the shopper types a number. Notice that `==` says everything is fine, and then `+` breaks it.

```mermaid
sequenceDiagram
    participant U as Shopper
    participant F as Form field
    participant C as Your code
    U->>F: types 2
    F->>C: gives the text "2"
    C->>C: qty == 2 is true, so it looks fine
    C->>C: qty + 1 joins two texts and gives "21"
    C-->>U: the cart shows 21 items
```

### 2c. How it works over time

This is the checklist `==` walks, top to bottom. Notice that after it changes one side, it starts again at rule 1.

```mermaid
graph TB
    S["a == b"] --> R1{"Rule 1. Same type?"}
    R1 -->|yes| E["Compare like ==="]
    R1 -->|no| R2{"Rule 2. null or undefined on one side?"}
    R2 -->|yes| N["true only if the other side is null or undefined too"]
    R2 -->|no| R3{"Rule 3. A string and a number?"}
    R3 -->|yes| C3["Turn the string into a number"]
    R3 -->|no| R4{"Rule 4. true or false on one side?"}
    R4 -->|yes| C4["Turn it into a number. true is 1 and false is 0"]
    R4 -->|no| R5{"Rule 5. An object on one side?"}
    R5 -->|yes| C5["Turn the object into a simple value"]
    R5 -->|no| F["Rule 6. Nothing matched so false"]
    C3 -->|start again at the top| R1
    C4 -->|start again at the top| R1
    C5 -->|start again at the top| R1
```

Here is `[] == false` going through it. Notice that every round changes only **one** side.

```mermaid
graph LR
    A["[] == false"] -->|false becomes 0| B["[] == 0"]
    B -->|the array becomes empty text| C["empty text == 0"]
    C -->|empty text becomes 0| D["0 == 0"]
    D -->|same type now| E["true"]
```

### 2d. What is in memory right now

A snapshot after these three lines:

```js
const qty = "2";
const a = [1];
const b = [1];
```

Notice that the simple value sits **inside** its slot. Each array is its own object, and the slot only points at it.

```mermaid
graph LR
    subgraph GS ["Global scope"]
        Q["qty holds the text 2"]
        A["a"]
        B["b"]
    end
    A -->|points at| X["Array object 1 holding 1"]
    B -->|points at| Y["Array object 2 holding 1"]
```

So `a == b` is `false`. Both are objects, so rule 1 matches. For objects, JavaScript does not look inside. It asks: is this the **same** object? It is not. [Lesson 03](03-reference-vs-copy.md) goes deep into this.

### 2e. Right against wrong

A free item has a price of `0`. Notice that the wrong check treats `0` like a missing price.

**Wrong:** `if (!price)` throws away every value that counts as false. (`!` means "not".)

```mermaid
graph LR
    A["price is 0"] --> B["if not price"]
    B -->|0 counts as false| C["shows Price missing"]
    C --> D["Bug. The item is free, not missing"]
```

**Right:** `if (price == null)` only catches `null` and `undefined`.

```mermaid
graph LR
    A["price is 0"] --> B["if price == null"]
    B -->|0 is not null or undefined| C["shows the price 0"]
    A2["price is null"] --> B
    B -->|null matches| C2["shows Price missing"]
```

### 2f. The 8 values that count as false

An `if` does not use the `==` checklist. It only looks at this short list. Notice what is **not** on it.

Two values on the list are new. `NaN` means "not a number". JavaScript gives it when it cannot make a number, like `Number("abc")`. `0n` is zero as a `bigint`, a rare type for very big whole numbers.

```mermaid
graph LR
    subgraph F ["Counts as false, only these 8"]
        F1["false"]
        F2["0 and -0"]
        F3["0n"]
        F4["empty text"]
        F5["null"]
        F6["undefined"]
        F7["NaN"]
    end
    subgraph T ["Counts as true, everything else"]
        T1["the text 0"]
        T2["the text false"]
        T3["empty array"]
        T4["empty object"]
    end
```

## 3. Real life analogy

You compare two prices, one in dollars and one in baht.

- **The strict check `===`** says: "Different money. Not equal." It never converts.
- **The loose check `==`** converts one price into the other money with a fixed list of rules, then compares.

Where the analogy stops:

- A real money changer picks a sensible rate. JavaScript's rules are fixed and sometimes surprising. An empty array becomes empty text, and then `0`.
- JavaScript almost always converts toward a **number**, not toward whatever makes sense.

## 4. The smallest code that shows it

```js
const qty = "2";            // a form field always gives you text
console.log(typeof qty);
console.log(qty + 1);
console.log(qty - 1);
console.log(qty == 2);
console.log(qty === 2);
console.log(null == 0);
console.log([] == false);
console.log(Boolean([]));
```

**Output:**

```
string
21
1
true
false
false
true
true
```

Look at lines 2 and 3 of the output. `+` joined the text, but `-` turned the text into a number. Look at the last two lines. The same empty array is `== false`, and also counts as true.

## 5. What really happens, step by step

| Step | Line | What JavaScript does | The two sides now | Prints |
|---|---|---|---|---|
| 1 | 1 | Puts the text `"2"` in the slot `qty`. It is a simple value. | | |
| 2 | 2 | `typeof qty` reads the type name. | | `string` |
| 3 | 3 | `+` sees text on one side. **If either side is text, `+` joins.** It turns `1` into `"1"` and joins. | `"2"` and `"1"` | `21` |
| 4 | 4 | `-` only works on numbers. It turns `"2"` into `2`. | `2` and `1` | `1` |
| 5 | 5 | `==` with a string and a number. Rule 3 turns `"2"` into `2`. | `2 == 2` | |
| 6 | 5 | Same type now. Rule 1 compares like `===`. | `2 == 2` | `true` |
| 7 | 6 | `===` sees two different types. It stops at once and never changes them. | `"2"` and `2` | `false` |
| 8 | 7 | `==` with `null`. Rule 2: `null` only equals `null` or `undefined`. `0` is neither. | `null` and `0` | `false` |
| 9 | 8 | Round 1. Rule 4: `false` becomes `0`. | `[] == 0` | |
| 10 | 8 | Round 2. Rule 5: the array becomes a simple value. It joins its items with commas. There are none, so it gives empty text. | `"" == 0` | |
| 11 | 8 | Round 3. Rule 3: empty text becomes `0`. | `0 == 0` | |
| 12 | 8 | Round 4. Same type. `0` is `0`. | `0 == 0` | `true` |
| 13 | 9 | `Boolean([])` asks the short list. `[]` is not on it, so it counts as true. | | `true` |

**Step through it yourself:** [open the == stepper](visuals/02-values-types-and-coercion.html). On the left, the checklist lights up the rule that matches in each round. On the right, you watch the two values and their types change. It has six small programs. Type your guess first, then press Next.

Checked on 2026-10-15 with Node 24.

## 6. Why it exists and what it costs

- **Problem without it:** JavaScript was made for small scripts in web pages. Almost everything from a page arrives as text. Changing types on its own let short scripts work without extra code. `"3" * 2` just gives `6`.
- **How it works:** a few signs change types for you.
  - `==` walks the checklist (picture 2c).
  - `+` joins if either side is text. Otherwise it adds numbers.
  - `-`, `*` and `/` always turn both sides into numbers.
  - `if`, `!`, `&&` and `||` use the "counts as false" list (picture 2f).
- **Cost:** the changes are hidden, so bugs are hidden too. `"2" + 1` gives `"21"` with no error.

Simple rules for your own code:

- Use `===` everywhere. Change types yourself, with `Number(qty)` or `String(id)`.
- One exception: `value == null` catches `null` and `undefined` together.
- When `0` or empty text is a real value, do not use `if (value)`.

<details><summary>Go deeper (optional)</summary>

**The full checklist.** The language rules (the ECMAScript spec, section "IsLooselyEqual") have 14 steps. The extra steps handle `bigint` and one old browser object, `document.all`. The order is: same type, null and undefined, string and number, bigint and string, boolean, object, bigint and number, then false. MDN's summary puts "object" before "boolean". Both orders give the same answers.

**How an object becomes a simple value.** JavaScript first calls the object's `valueOf()`. For arrays and plain objects that gives back the object itself, which is not simple. So JavaScript then calls `toString()`. `[]` gives `""`. `[1, 2]` gives `"1,2"`. `{}` gives `"[object Object]"`. So `{} == "[object Object]"` is `true`.

**Why `typeof null` is `"object"`.** In the first version of JavaScript, every value had a small type tag. The tag for objects was 0. `null` was stored as all zeros, so it looked like an object. A fix was proposed later, but it was rejected.

**Simple values cannot change.** `let s = "hi"; s[0] = "H";` leaves `s` as `"hi"`. Methods like `s.toUpperCase()` give you a **new** string. The interview word for "cannot change" is *immutable*.

**`NaN` and `-0`.** `NaN === NaN` is `false`. Use `Number.isNaN(x)`. `0 === -0` is `true`. `Object.is(a, b)` is like `===`, except `Object.is(NaN, NaN)` is `true` and `Object.is(0, -0)` is `false`.

**`<` and `>` use different rules from `==`.** `null == 0` is `false`, but `null >= 0` is `true`. The size checks turn `null` into `0`. `==` does not.

**`??` against `||`.** `count || 10` gives `10` when `count` is `0`, because `0` counts as false. `count ?? 10` only replaces `null` and `undefined`, so it keeps `0`.

**Finding a plain object.** `typeof value === "object"` is also true for `null` and for arrays. Write `value !== null && typeof value === "object" && !Array.isArray(value)`.

**`==` is not even consistent with itself.** `0 == ""` is `true` and `0 == "0"` is `true`, but `"" == "0"` is `false`. Both sides are strings there, so no type changes.

</details>

## 7. Common mistakes

**Wrong:** adding text from a form.

```js
const qty = "2";            // from an input field
console.log(qty + 1);       // "21"
```

**Right:** turn it into a number yourself, once, where the value comes in.

```js
const qty = Number("2");
console.log(qty + 1);       // 3
```

**Why:** `+` joins when either side is text. `Number()` makes the type change visible.

**Wrong:** `if (!price)` for a missing value.

```js
function priceLabel(price) {
  if (!price) return "Price missing";
  return "$" + price;
}
priceLabel(0);   // "Price missing", but the item is free
```

**Right:** catch only `null` and `undefined`.

```js
if (price == null) return "Price missing";   // priceLabel(0) is now "$0"
```

**Why:** `0` is on the "counts as false" list, but it is a real price.

**Wrong:** a number on the left of `&&` in React. *This is an idea about your stack, not a fact about your code.*

```jsx
{messageCount && <p>New messages</p>}   // shows 0 on the screen when messageCount is 0
```

**Right:** make the left side a real `true` or `false`.

```jsx
{messageCount > 0 && <p>New messages</p>}
```

**Why:** `&&` gives back the left value when it counts as false. That value is `0`, and React draws numbers. The React docs warn about this exact case (section 8).

**Wrong:** checking for `NaN` with `===`.

```js
const n = Number("abc");    // NaN, "not a number"
console.log(n === NaN);     // false, always
```

**Right:**

```js
console.log(Number.isNaN(n));   // true
```

**Why:** `NaN` is the one value that is not equal to itself.

## 8. Watch and play

Links checked on 2026-10-15. Each page opened. For each video, the title and channel matched. The video lengths were not checked.

- **Video:** [Watch This If You Don't Understand Type Coercion](https://www.youtube.com/watch?v=GKJh3vdat8A) by Web Dev Simplified. Watch it after the stepper.
- **Video:** [Falsy and Truthy in JavaScript](https://www.youtube.com/watch?v=J3CTnNtsi_w) by Lucas Paganini. A walk through the "counts as false" list.
- **Play with it:** [The == stepper](visuals/02-values-types-and-coercion.html) in this folder. Guess first, then press Next.
- **Play with it:** [JS Comparison Table](https://dorey.github.io/JavaScript-Equality-Table/). Many value pairs side by side. Compare the `==` section with the `===` section and the `if()` section.
- **Play with it:** [Python Tutor for JavaScript](https://pythontutor.com/javascript.html). Paste the code from section 2d. Its guide says it shows when two names point at the same array, so check that `a` and `b` point at two different arrays.
- **Read:** [Type Conversions](https://javascript.info/type-conversions) on javascript.info. Two short tables: what becomes which number, and what becomes `false`.
- **Read:** [Comparisons](https://javascript.info/comparison) on javascript.info. Read "Strict equality" and "Comparison with null and undefined".

<details><summary>More links (optional)</summary>

- **Read:** [Equality (==) on MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Equality). The checklist in MDN's words.
- **Read:** [Equality comparisons and sameness on MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness). A big table of `==`, `===` and `Object.is` for about 30 pairs.
- **Read:** [Falsy on MDN](https://developer.mozilla.org/en-US/docs/Glossary/Falsy). The full list, with `document.all`.
- **Read:** [typeof on MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof). The full table, and the story of `typeof null`.
- **Read:** [JavaScript data types and data structures on MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Data_structures). The 7 simple types, and a "Type coercion" section.
- **Read (React):** [Conditional Rendering](https://react.dev/learn/conditional-rendering). The pitfall "Don't put numbers on the left side of &&".
- **Read (interview):** [What is the difference between == and ===?](https://www.greatfrontend.com/questions/quiz/what-is-the-difference-between-double-equal-and-triple-equal) on GreatFrontEnd. How the question is asked, with `[] == ![]`.
- **Read (spec):** [IsLooselyEqual in the ECMAScript spec](https://tc39.es/ecma262/#sec-islooselyequal). The real 14 steps. Very dry.

</details>

## 9. Practice

**A. Predict the output** (write your answer before opening)

```js
console.log(typeof NaN);
console.log("3" * "4");
console.log(true + 1);
console.log(0 == "");
console.log(Boolean("0"));
console.log(Boolean(" "));
```

<details><summary>Answer</summary>

```
number
12
2
true
true
true
```

- `NaN` means "not a number", but its type is still `number`.
- `*` turns both texts into numbers.
- `+` has no text here, so it adds numbers. `true` becomes `1`.
- `0 == ""`: rule 3 turns empty text into `0`.
- `"0"` and `" "` are not empty text. Any text with something in it counts as true.

</details>

**B. Fix the bug**

```js
function stockLabel(stock) {
  if (!stock) return "Unknown";
  return stock + " left";
}
console.log(stockLabel(0));          // "Unknown". It should be "0 left".
console.log(stockLabel(undefined));  // "Unknown". This one is right.
```

<details><summary>Answer</summary>

`0` counts as false, so `!stock` is `true` and the function stops early. Catch only `null` and `undefined`:

```js
function stockLabel(stock) {
  if (stock == null) return "Unknown";
  return stock + " left";
}
```

Now `stockLabel(0)` gives `"0 left"`, and `stockLabel(undefined)` still gives `"Unknown"`. If your team bans `==`, write `stock === null || stock === undefined`.

</details>

**C. Write it yourself**

Open `practice/02-values-types-and-coercion.js`. There are four tasks:

1. Fix `totalQty` so `totalQty("2", "1")` gives the number `3`.
2. Write `typeName(value)`: like `typeof`, but it says `"null"` and `"array"`.
3. Write `isMissing(value)`: `true` only for `null` and `undefined`.
4. Write down what six snippets print.

Run the tests from the folder that contains `learn/`:

```
node --test learn/javascript/practice/02-values-types-and-coercion.test.js
```

At the start, one test already passes: two real numbers add fine. That is how the bug hides. It only shows when text comes in.

<details><summary>One possible answer</summary>

```js
function totalQty(a, b) {
  return Number(a) + Number(b);   // change the types yourself, then + adds
}

function typeName(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function isMissing(value) {
  return value == null;           // true only for null and undefined
}

const predictions = {
  s1: ["object", "object"],
  s2: ["51", "4"],
  s3: ["true", "false"],
  s4: ["false", "true"],
  s5: ["true", "runs"],
  s6: ["false", "false"],
};
```

For `s6`: `"" == "0"` is `false` because both sides are strings. Rule 1 matches, and two different texts are not equal.

</details>

## 10. Interview question

**Q:** "What is the difference between `==` and `===`? What does `[] == false` give, and why? Which values are falsy?"

<details><summary>A strong answer, in four parts</summary>

1. **Problem:** values often arrive with the wrong type. Form fields and URL values are always text. You need to compare them safely.
2. **How it works:**
   - `===` never changes a type. Different types give `false` at once.
   - `==` walks a checklist. If the types differ, it changes one side and starts again. Strings and booleans become numbers. Objects become simple values. `null` only equals `undefined`.
   - `[] == false`: `false` becomes `0`. The array becomes empty text. Empty text becomes `0`. `0 == 0` is `true`.
   - An `if` uses a different rule. It counts 8 values as false: `false`, `0`, `-0`, `0n`, `""`, `null`, `undefined` and `NaN`. Everything else counts as true, so `if ([])` runs.
3. **Tradeoff:** `==` is shorter, but its changes are hidden and surprising. I use `===` everywhere. The one exception is `value == null`, which catches `null` and `undefined` together. I also change types myself, with `Number()` or `String()`.
4. **My example:** *This is an idea, not a fact. Replace it with your own real story from DBO, Unloan, ZWS or Skyworx.* In a commerce app like DBO, a quantity or price from a form field or a URL is text. Adding it with `+` would join text, like `"2" + 1` giving `"21"`. A check like `if (!price)` would treat a free item as missing. The fix is to turn the value into a number where it comes in, and check for `null` instead of "counts as false".

</details>

## 11. Explain it back

Close this file. Press the **Record my explanation** button under this heading and explain this lesson out loud, like to a new junior, in 4 parts: problem, how it works, tradeoff, my example. Walk `[] == false` round by round, and name the 8 values that count as false. Then save the transcript file into `my-learning/recordings/`, or write your best version below. Run `/explain-check coercion` or ask the `explain-coach` agent to review it.

### My explanation

<write here>

### Coach feedback

<the explain-coach agent writes here>

## 12. Review questions (day 1, 3, 7, 21)

1. What is the difference between a simple value and an object? What does `typeof null` give, and what does `typeof []` give?
2. Walk `true == "1"` round by round. Which rule matches in each round?
3. Name the 8 values that count as false. Does `if ("0")` run? Does `if ([])` run?
4. Draw the `==` checklist from picture 2c from memory.

<details><summary>Answers</summary>

1. A simple value is one plain value with no parts, like `5`, `"hi"` or `true`. It sits inside its slot. An object has parts, like `{}`, `[]` or a function, and the slot points at it. `typeof null` gives `"object"` (an old mistake). `typeof []` gives `"object"` too, so use `Array.isArray`.
2. Round 1: rule 4, `true` becomes `1`, so `1 == "1"`. Round 2: rule 3, `"1"` becomes `1`, so `1 == 1`. Round 3: rule 1, same type, `true`.
3. `false`, `0`, `-0`, `0n`, `""`, `null`, `undefined`, `NaN`. Yes, `if ("0")` runs, because the text is not empty. Yes, `if ([])` runs, because every object counts as true.
4. Same type? Compare like `===`. null or undefined? True only if both are. String and number? String becomes a number. Boolean? It becomes a number. Object? It becomes a simple value. Nothing matched? False. After a change, start again at the top.

</details>

## Connected lessons

- [Variables, scope and hoisting](01-variables-scope-and-hoisting.md): the slots that hold these values. A simple value sits inside the slot.
- [Reference vs copy](03-reference-vs-copy.md): the next lesson. Why a slot only points at an object, and why changing a copy can change the original.
- [Functions](04-functions.md): functions are objects, which is why `typeof` has its own answer for them.
- [Objects and prototypes](07-objects-and-prototypes.md): where `valueOf` and `toString` come from when an object becomes a simple value.
- [Destructuring, spread and rest](10-destructuring-spread-and-rest.md): default values there only replace `undefined`, not every value that counts as false.
