# 04. Functions

> **Subject:** JavaScript · **Lesson:** 04 · **Made:** 2026-10-15 · **Status:** ready
> **You will be able to:** write a function in three ways and say which one you can call before its line, say what one call puts on the call stack, and pass a function to another function without calling it.
> **Before this:** [Reference vs copy](03-reference-vs-copy.md) · **Next:** [Closures](05-closures.md)

## 1. The idea in one sentence

A function is a list of steps you write once and run many times. Each call gets its own new box, and gives one value back. A function is also a value, so you can store it, pass it and return it, like a number.

New words:

- **Scope box:** the place in memory where the names of one call live. Every call makes a **new** box. (Interview word: *execution context*.)
- **Call stack:** the list of calls that are running now. A new call goes on top. When it is done, it leaves.
- **Parameter and argument:** a parameter is a name in the brackets where you write the function, like `name`. An argument is the value you put in when you call it, like `"Ana"`. A parameter can have a **default**, a value used when no argument comes in: `word = "Hello"`.
- **Return value:** the value a call gives back. With no `return`, you get `undefined`.

Words from lesson 01: a **slot** is a named place that holds one value. A **locked** slot is a `let` or `const` slot before its line runs.

## 2. The pictures

### 2a. The big picture

Notice that every call starts with a new box and ends by giving one value back.

```mermaid
graph LR
    A["You call greet with Ana"] -->|JavaScript makes| B["a new scope box"]
    B -->|puts the argument in| C["slot name = Ana"]
    C -->|runs the steps| D["return gives back Hi Ana"]
    D -->|the call is done| E["the box is thrown away"]
```

### 2b. The problem, drawn

Without functions you copy the same steps into many places. Notice the place that was forgotten.

```mermaid
graph TB
    A1["fee steps copied into the cart page"]
    A2["fee steps copied into the checkout page"]
    A3["fee steps copied into the email"]
    C["The fee changes"] -->|you update| A1
    C -->|you update| A2
    C -->|you forget to update| A3
    A3 --> X["The email shows the old fee"]
```

With a function, the steps live in one place. Every page calls it.

```mermaid
graph TB
    P1["cart page"] -->|calls| F["function addFee, written once"]
    P2["checkout page"] -->|calls| F
    P3["email"] -->|calls| F
    F --> R["Change the fee in one place and every page gets it"]
```

### 2c. How it works over time

This is the last line of the code in section 4: `twice(double, 3)`. Notice that `twice` waits while `double` runs, and that `double` gets a new box each time.

```mermaid
sequenceDiagram
    participant M as main script
    participant T as twice call
    participant D1 as double call 1
    participant D2 as double call 2
    M->>T: call twice with fn = double and x = 3
    Note over T: new box with fn and x
    T->>D1: inner fn of x means double of 3
    Note over D1: new box with n = 3
    D1-->>T: gives back 6 and its box is thrown away
    T->>D2: outer fn of 6 means double of 6
    Note over D2: another new box with n = 6
    D2-->>T: gives back 12 and its box is thrown away
    T-->>M: gives back 12
    Note over M: console.log prints 12
```

### 2d. What is in memory right now

A snapshot **inside the first `double` call**. Three calls are on the stack. Notice that the slot `double` and the slot `fn` point at the **same** function. There is one function, not two.

```mermaid
graph LR
    subgraph ST ["Call stack"]
        S3["double with n = 3 is running"] -->|on top of| S2["twice is paused"]
        S2 -->|on top of| S1["main script"]
    end
    subgraph GB ["Global box"]
        G1["greet"]
        G2["double"]
        G3["twice"]
    end
    subgraph TW ["Box of the twice call"]
        T1["fn"]
        T2["x = 3"]
    end
    subgraph DB ["Box of the double call"]
        D1["n = 3"]
    end
    G2 -->|points at| FN["the double function"]
    T1 -->|points at the same| FN
```

### 2e. Right against wrong

The three ways to write a function look like this:

```js
function add(a, b) { return a + b; }             // function declaration
const add2 = function (a, b) { return a + b; };  // function expression
const add3 = (a, b) => a + b;                     // arrow function
```

Before line 1, JavaScript makes a slot for every name. Lesson 01 called this **hoisting**.

**Wrong picture:** "every function is made before line 1, so I can call any of them early."

```mermaid
graph LR
    A["Wrong picture"] --> B["all functions are made before line 1"]
    B --> C["so I can call any of them early"]
```

**Right picture:** only the **slots** are made early. What sits in the slot depends on how you wrote the function.

```mermaid
graph TB
    S["Setup before line 1"] -->|function declaration| D["slot holds the whole function. Call it anywhere"]
    S -->|const or let with an expression| E["slot is locked. Calling early is a ReferenceError"]
    S -->|const or let with an arrow| F["slot is locked. Calling early is a ReferenceError"]
    S -->|var with an expression| G["slot holds undefined. Calling early is a TypeError"]
```

### 2f. A function is a value

Notice the three things you can do with a function besides calling it. The two lessons they lead to are on the right.

```mermaid
graph LR
    F["a function"] -->|store it in a slot| A["const hello = sayHi"]
    F -->|pass it into another function| B["runTwice gets sayHi"]
    F -->|give it back from a call| C["return a function"]
    B -->|this is how| M["map and filter work. Lesson 09"]
    C -->|this is how| K["closures work. Lesson 05"]
```

A function you pass in, so another function can call it later, is a **callback**. The interview word for "functions are values" is *first-class functions*.

### 2g. Passing `fn` against passing `fn()`

Brackets mean **call it now**. Notice what `run` gets in each case.

```mermaid
graph TB
    A["run with sayHi"] -->|no brackets| B["run gets the function"]
    B --> C["run calls it when it wants. Works"]
    D["run with sayHi and brackets"] -->|brackets mean call it now| E["sayHi runs first and gives back Hi"]
    E --> F["run gets the text Hi and cannot call it. TypeError"]
```

## 3. Real life analogy

A function is a **recipe card**.

- Writing the card is not cooking. (Writing a function does not run it.)
- The card has blanks: "use ___ eggs". Those are the **parameters**. What you fill in today, like 3, is the **argument**.
- Each time you cook, you get a clean worktop. That is the **scope box**. After cooking, you clean it.
- The finished dish you hand over is the **return value**. A card with no "serve" step hands over nothing: `undefined`.
- A step can say "now make the sauce card". You stop the cake, make the sauce, then continue the cake. That is the **call stack**.
- You can hand the **card** to a friend, and they cook when they want. That is passing `fn`. Passing `fn()` is cooking the dish yourself and handing over the dish. Your friend cannot cook from a cake.

Where the analogy stops:

- In real life you might hand over a photocopy. In JavaScript nothing is copied. Both names point at the **same** function.
- A function also remembers the kitchen where it was written. That is lesson 05.

## 4. The smallest code that shows it

```js
function greet(name, word = "Hello") {   // declaration
  return word + " " + name;
}
const double = function (n) {            // expression
  return n * 2;
};
const twice = (fn, x) => fn(fn(x));      // arrow
console.log(greet("Ana", "Hi"));
console.log(greet("Budi"));
console.log(greet());
console.log(twice(double, 3));
```

**Output:**

```
Hi Ana
Hello Budi
Hello undefined
12
```

Look at the third line of output. A missing argument is not an error. It is `undefined`.

Checked on 2026-10-15 with Node 24.15.0.

## 5. What really happens, step by step

| Step | Line | What happens | Call stack | Boxes alive | Prints |
|---|---|---|---|---|---|
| 1 | setup | JavaScript makes the Global box. `greet` holds the whole function. `double` and `twice` are locked. | main | Global | |
| 2 | 4 | JavaScript makes a function and puts it in `double`. | main | Global | |
| 3 | 7 | JavaScript makes an arrow function and puts it in `twice`. | main | Global | |
| 4 | 8 | `greet("Ana", "Hi")` is called. A new box: `name = "Ana"`, `word = "Hi"`. | main, greet | Global, greet box | |
| 5 | 2 | It gives back `"Hi Ana"`. The call leaves. Its box is thrown away. | main | Global | Hi Ana |
| 6 | 9 | `greet("Budi")`. A new box: `name = "Budi"`. `word` got nothing, so the default `"Hello"` goes in. | main, greet | Global, greet box | |
| 7 | 2 | It gives back `"Hello Budi"`. Its box is thrown away. | main | Global | Hello Budi |
| 8 | 10 | `greet()`. A new box: `name` is `undefined`, `word` is `"Hello"`. It gives back `"Hello undefined"`. | main | Global | Hello undefined |
| 9 | 11 | `twice(double, 3)`. A new box: `fn` points at the `double` function, `x = 3`. | main, twice | Global, twice box | |
| 10 | 7 | The inner `fn(x)` runs first. It calls `double(3)`. A new box: `n = 3`. `twice` is paused. | main, twice, double | Global, twice box, double box | |
| 11 | 5 | `double` gives back 6. Its box is thrown away. | main, twice | Global, twice box | |
| 12 | 7 | The outer `fn(6)` calls `double` again. **Another new box**: `n = 6`. | main, twice, double | Global, twice box, new double box | |
| 13 | 5 | `double` gives back 12. Its box is thrown away. | main, twice | Global, twice box | |
| 14 | 7 | `twice` gives back 12 and leaves. Its box is thrown away. | main | Global | 12 |

Two more facts:

- **Extra arguments are ignored.** `greet("Ana", "Hi", "x")` works the same. To collect any number of arguments, use rest parameters, `...args` (lesson 10).
- **Parameters are slots inside the call box.** Two calls never share them. That is why `n = 3` and `n = 6` never mix.

**Step through it yourself:** [open the functions stepper](visuals/04-functions.html). It has two panels: the **call stack** and the **scope boxes**. It has six programs: "Before its line", "Missing argument", "No return", "Pass a function", "fn or fn()", and "Nested calls", which is the code from section 4. Write your guess first, then press Next.

## 6. Why it exists and what it costs

- **Problem without it:** you copy the same steps into many places (picture 2b). One change needs many edits, and one gets missed. A loop can also do only the one job written inside it.
- **How it solves it:**
  - You write the steps **once** and call them from anywhere.
  - Each call gets its **own box**, so two calls never disturb each other.
  - Because a function is a value, you can pass in **what to do**. One `twice` works with `double`, `square` or anything else. This is the idea behind `map` and `filter` (lesson 09).
- **Cost:**
  - Every call takes a place on the call stack and a new box. This is tiny. Only very deep calls run out of room (Go deeper below).
  - Many tiny functions make code jump around, which is harder to read.
  - A declaration can be called before its line. Handy, but the file no longer reads top to bottom.
- **Which one to pick:**
  - **Declaration** for a named helper. It is ready anywhere in the file.
  - **Arrow** for a short function you pass in, like `prices.map(p => p * 2)`.
  - **Expression** when you want the function to exist only after its line.
  - Many teams use `const` with arrows everywhere. Both styles are fine. Pick one and be consistent.
  - Arrow functions also handle `this` differently. That is lesson 06.

<details><summary>Go deeper (optional)</summary>

All of these were run with Node 24.15.0 on 2026-10-15.

- **A default fills in only for `undefined`.** `function f(x = 5) { return x; }` gives `f(null)` = `null`, `f(undefined)` = `5`, `f(0)` = `0`. MDN shows this in "Passing undefined vs. other falsy values".
- **`return` on its own line gives `undefined`.** If you write `return` and put the value on the next line, JavaScript ends the line after `return` and gives back `undefined`. Keep the value on the same line as `return`.
- **An arrow that gives back an object needs round brackets.** `() => { id: 1 }` gives `undefined`, because JavaScript reads the curly braces as the body. Write `() => ({ id: 1 })`.
- **An object you pass in is not copied.** The parameter points at the same object. So `function rename(user) { user.name = "Budi"; }` changes the object you passed in. See lesson 03.
- **The stack has a size limit.** A function that calls itself forever fills the stack. Node throws `RangeError: Maximum call stack size exceeded`.
- **Arrow functions have no `arguments` object and cannot be used with `new`.** See lessons 06 and 08.
- **`typeof` of any function is `"function"`.** That includes arrows.

</details>

## 7. Common mistakes

**Wrong:** calling an arrow or an expression before its line.

```js
console.log(b());   // ReferenceError: Cannot access 'b' before initialization
const b = () => "b";
```

**Right:** call it after its line, or write it as a function declaration.

**Why:** the `const` slot is locked until its line runs. Only a declaration slot holds the whole function from the start.

**Wrong:** an arrow with curly braces and no `return`.

```js
const double = (n) => {
  n * 2;
};
console.log(double(4));   // undefined
```

**Right:** add `return`, or remove the braces.

```js
const double = (n) => n * 2;
console.log(double(4));   // 8
```

**Why:** with curly braces, an arrow is like any function. It reaches its end with no `return`, so it gives back `undefined`.

**Wrong:** passing `fn()` when you meant `fn`.

```js
function sayHi() { return "Hi"; }
function run(fn) { return fn(); }
console.log(run(sayHi()));   // TypeError: fn is not a function
```

**Right:** `run(sayHi)`. No brackets. It prints `Hi`.

**Why:** brackets mean "call it now". `sayHi()` runs first and gives back the text `"Hi"`. Then `run` tries to call a text, which fails. In React it is the same: `onClick={handleClick}`, not `onClick={handleClick()}`. The second one runs during render.

## 8. Watch and play

Links checked on 2026-10-15. Each page opened. For each video, the title and channel matched. The video lengths are not checked.

- **Video:** [How functions work in JS & Variable Environment, Namaste JavaScript Ep. 4](https://www.youtube.com/watch?v=gSDncyuGw0s) by Akshay Saini. A new box for every call, and the call stack. He says "execution context" for the box.
- **Video:** [First Class Functions ft. Anonymous Functions, Namaste JavaScript Ep. 13](https://www.youtube.com/watch?v=SHINoHxvTso) by Akshay Saini. Declaration against expression, and functions as values.
- **Video:** [JavaScript ES6 Arrow Functions Tutorial](https://www.youtube.com/watch?v=h33Srr5J9nY) by Web Dev Simplified. How to turn a normal function into an arrow. Skip the `this` part until lesson 06.
- **Play with it:** [The functions stepper](visuals/04-functions.html) in this folder. Guess first, then press Next.
- **Play with it:** [Python Tutor for JavaScript](https://pythontutor.com/javascript.html). Paste the code from section 4. Its [guide](https://pythontutor.com/articles/javascript-visualizer.html) says each function call gets its own frame. Watch the frames appear and go.
- **Read:** [Function expressions](https://javascript.info/function-expressions) on javascript.info. Read "Function is a value" and "Function Expression vs Function Declaration".
- **Read:** [Call stack](https://developer.mozilla.org/en-US/docs/Glossary/Call_stack) on MDN. A short page with a step list of what goes on and off the stack.

<details><summary>More links (optional)</summary>

- **Read:** [Functions](https://javascript.info/function-basics) on javascript.info. Parameters, default values, and `return`.
- **Read:** [Arrow functions, the basics](https://javascript.info/arrow-functions-basics) on javascript.info. See "Multiline arrow functions" for the missing `return` bug.
- **Read:** [Functions guide on MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions). See "Function hoisting" and "Default parameters".
- **Read:** [Default parameters on MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters). See "Passing undefined vs. other falsy values".
- **Read:** [First-class function on MDN](https://developer.mozilla.org/en-US/docs/Glossary/First-class_Function). Three short examples: store, pass, return.

</details>

## 9. Practice

**A. Predict the output** (write your answer before opening)

```js
console.log(total(10));
function total(price, qty = 2) {
  return price * qty;
}
console.log(total(10, 3));
const half = (n) => { n / 2; };
console.log(half(8));
console.log(typeof half);
```

<details><summary>Answer</summary>

```
20
30
undefined
function
```

- Line 1 works: `total` is a declaration, so it is ready before its line. `qty` is missing, so the default 2 is used.
- `total(10, 3)` uses the 3 you passed.
- `half` has curly braces and no `return`, so it gives back `undefined`.
- A function is a value, and its type is `"function"`.

</details>

**B. Fix the bug**

This should print `working`, then `done`.

```js
function sayDone() {
  console.log("done");
}
function runLater(callback) {
  console.log("working");
  callback();
}
runLater(sayDone());
```

<details><summary>Answer</summary>

It prints `done`, then `working`, then `TypeError: callback is not a function`.

`sayDone()` has brackets, so it runs **first**, before `runLater`. It prints `done` and gives back `undefined`. So `callback` is `undefined`, and calling it fails.

Fix: pass the function, not its result.

```js
runLater(sayDone);   // prints working, then done
```

</details>

**C. Write it yourself**

Open `practice/04-functions.js`. There are five tasks:

1. Fix `addFee`, which gives back `undefined`.
2. Write `formatPrice(amount, currency)` with a default currency.
3. Write `applyTimes(fn, times, start)`, which calls a function you pass in.
4. Write `getOperation(name)`, which gives back a function.
5. Write down what six snippets print.

Run the tests from the folder that contains `learn/`:

```
node --test learn/javascript/practice/04-functions.test.js
```

At the start, all 16 tests fail. That is expected.

<details><summary>One possible answer</summary>

```js
const addFee = (price) => price + 10;      // or keep the braces and add return

function formatPrice(amount, currency = "IDR") {
  return currency + " " + amount;
}

function applyTimes(fn, times, start) {
  let result = start;
  for (let i = 0; i < times; i++) {
    result = fn(result);                    // call the function you were given
  }
  return result;
}

const double = (n) => n * 2;
const square = (n) => n * n;
const same = (n) => n;

function getOperation(name) {
  if (name === "double") return double;     // no brackets: give back the function
  if (name === "square") return square;
  return same;
}

const predictions = {
  s1: ["function", "undefined"],
  s2: ["1", "undefined"],
  s3: ["5", "0"],
  s4: ["undefined", "2"],
  s5: ["hi", "function", "true"],
  s6: ["a starts", "b runs", "a ends"],
};
```

Why `s6` is in that order: `a` is paused while `b` is on top of the stack. When `b` is done, `a` continues.

</details>

## 10. Interview question

**Q:** "What is the difference between a function declaration, a function expression and an arrow function? What does this print? And what does 'functions are first-class' mean?"

```js
console.log(a());
console.log(b());
function a() { return "a"; }
const b = () => "b";
```

<details><summary>A strong answer, in four parts</summary>

1. **Problem:** you need steps you can run many times with different values. And you often need to hand those steps to other code, like `map`, a timer or a click handler.
2. **How it works:**
   - Every call goes on the call stack and gets a new scope box. The arguments go into the parameter slots. A missing one is `undefined`, unless it has a default. The call gives back its return value, or `undefined`, then leaves the stack.
   - Before line 1, JavaScript makes the slots. A **declaration** slot holds the whole function, so you can call it early. An **expression** or **arrow** in a `const` slot is locked until its line runs.
   - So the code prints `a`, then throws `ReferenceError: Cannot access 'b' before initialization`.
   - **First-class** means a function is a value. You can store it, pass it in, and give it back. Passing it in gives you callbacks and `map` and `filter`. Giving it back gives you closures.
3. **Tradeoff:** declarations are ready anywhere, but the file stops reading top to bottom. Arrows are short and good for callbacks, but they treat `this` differently (lesson 06). Every call costs a stack place and a box, which only matters for very deep calls.
4. **My example:** *This is an idea, not a fact. Replace it with your own real story from DBO, Unloan, ZWS or Skyworx.* In an Express API, `app.get("/orders", (req, res) => { ... })` passes an arrow function. Express calls it later, once per request. In React Native, `onPress={handlePress}` passes the function. `onPress={handlePress()}` would run it during render.

</details>

## 11. Explain it back

Close this file. Press the **Record my explanation** button under this heading and explain functions out loud, like to a new junior, in 4 parts: problem, how it works, tradeoff, my example. Use the words "call stack", "scope box" and "return value". Then save the transcript file into `my-learning/recordings/`, or write your best version below. Run `/explain-check functions` or ask the `explain-coach` agent to review it.

### My explanation

<write here>

### Coach feedback

<the explain-coach agent writes here>

## 12. Review questions (day 1, 3, 7, 21)

1. Which of the three ways to write a function can you call before its line, and why?
2. What happens on the call stack and in memory when you call `greet("Budi")`? What is in the `word` slot?
3. What is the difference between `run(sayHi)` and `run(sayHi())`?
4. Draw the picture from section 2d from memory: the call stack with three calls, the boxes, and the two slots that point at one function.

<details><summary>Answers</summary>

1. Only a function declaration. Before line 1, JavaScript puts the whole function in its slot. A function expression or arrow in `const` or `let` is in a locked slot until its line runs, so calling it early is a `ReferenceError`. With `var`, the slot holds `undefined`, so it is a `TypeError`.
2. The call goes on top of the stack and gets a new scope box. `name` gets `"Budi"`. `word` got no argument, so it would be `undefined`, but it has a default, so it holds `"Hello"`. The call gives back `"Hello Budi"`, leaves the stack, and its box is thrown away.
3. `run(sayHi)` hands over the function, and `run` calls it when it wants. `run(sayHi())` calls `sayHi` first and hands over what it gave back. If that is not a function, `run` cannot call it.
4. The stack is main, then `twice` (paused), then `double` with `n = 3` on top. The Global box holds `greet`, `double` and `twice`. The `twice` box holds `fn` and `x = 3`. The `double` box holds `n = 3`. The slot `double` and the slot `fn` both point at the same function.

</details>

## Connected lessons

- [Variables, scope and hoisting](01-variables-scope-and-hoisting.md): why a declaration is ready before its line and a `const` is locked.
- [Reference vs copy](03-reference-vs-copy.md): when you pass an object into a function, the function can change it.
- [Closures](05-closures.md): the next lesson. A function given back from a call remembers the box where it was made.
- [this, call, apply and bind](06-this-call-apply-and-bind.md): how arrow functions and normal functions differ in `this`.
- [Arrays and higher order functions](09-arrays-and-higher-order-functions.md): `map`, `filter` and `reduce` take a function you pass in.
- [Destructuring, spread and rest](10-destructuring-spread-and-rest.md): `...args` collects any number of arguments.
- [The event loop](11-the-event-loop.md): a timer callback is a function you pass in, which runs later when the stack is empty.
