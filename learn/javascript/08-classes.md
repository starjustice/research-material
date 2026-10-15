# 08. Classes

> **Subject:** JavaScript · **Lesson:** 08 · **Made:** 2026-10-15 · **Status:** ready
> **You will be able to:** draw the objects that one `class` line makes, say why `super()` must run before `this` in a child class, and explain why a `#` field is really private.
> **Before this:** [Objects and prototypes](07-objects-and-prototypes.md) · **Next:** [Arrays and higher order functions](09-arrays-and-higher-order-functions.md)

## 1. The idea in one sentence

A `class` builds two things for you: a function that makes objects, and one shared object that holds their methods.

In lesson 07 you built these two by hand. So a class is not a new kind of thing. It is a shorter way to write prototypes, plus a few safety rules.

New words:

- **Instance:** an object made from a class with `new`. In `const rex = new Dog("Rex")`, `rex` is an instance of `Dog`.
- **Parent class and child class:** in `class Dog extends Animal`, `Animal` is the parent class and `Dog` is the child class. (Interview words: *base class* or *superclass*, and *derived class* or *subclass*.)
- **Field:** a line in the class body like `count = 0`. JavaScript runs it again for every new instance and writes the value on that instance. (Interview word: *class field*.)
- **Private slot:** a field whose name starts with `#`. It sits inside the object, but it is not a property. Only code written inside the class can reach it. (Interview word: *private field*.)

Words from earlier lessons: the **hidden link** leads to the next object JavaScript asks (lesson 07). An **own property** is stored on the object itself. **Strict mode** is the safer setting from lesson 06, and class code always uses it.

The rule to remember: **a class is a function. Its methods sit on one shared prototype object. Every instance has an arrow to that object. `extends` adds two more arrows. In a child class, `super()` must run before `this` is unlocked, because the parent class builds the object.**

## 2. The pictures

### 2a. The big picture

One class line makes two things. Notice that `bark` is stored once, on `Dog.prototype`. Every instance has an arrow to it.

```mermaid
graph LR
    C["class Dog with a constructor and bark"] -->|JavaScript makes| F["Dog, a function"]
    C -->|JavaScript makes| P["Dog.prototype holding bark"]
    F -->|prototype| P
    P -->|constructor| F
    N["new Dog with Rex"] -->|makes| R["rex holding name"]
    R -->|hidden link| P
```

### 2b. The problem, drawn

**Problem 1.** Before classes, you wired a child type by hand. Notice how many steps there are, and what breaks quietly if you forget one.

```mermaid
graph TB
    S1["Step 1 write function Animal and put speak on Animal.prototype"] --> S2["Step 2 write function Dog and call Animal.call inside it"]
    S2 --> S3["Step 3 link Dog.prototype to Animal.prototype with Object.create"]
    S3 --> S4["Step 4 put constructor back on Dog.prototype"]
    S4 --> S5["Step 5 put bark on Dog.prototype"]
    S2 -->|if you forget it| B1["speak says undefined makes a sound"]
    S3 -->|if you forget it| B2["TypeError rex.speak is not a function"]
    S4 -->|if you forget it| B3["rex.constructor says Animal"]
```

**Problem 2.** People wrote `_balance` to mean "please do not touch". Notice that nothing stops outside code.

```mermaid
graph LR
    O["any outside code"] -->|reads and changes| A["account with _balance = 50"]
    A --> R["The underscore is only a polite sign"]
```

### 2c. How it works over time

This is `new Dog("Rex")` when `Dog extends Animal`. Notice that the **parent** constructor makes the object, and `this` is locked until then.

```mermaid
sequenceDiagram
    participant Y as Your code
    participant D as Dog constructor
    participant A as Animal constructor
    participant M as Memory
    Y->>D: new Dog with Rex
    Note over D: this is locked. No object exists yet.
    D->>A: super with name
    A->>M: make an empty object linked to Dog.prototype
    A->>M: write name = Rex on it
    A-->>D: hand back the object
    Note over D: this is unlocked now
    D->>M: write tricks = 0 on it
    D-->>Y: new gives back the object and rex holds it
```

### 2d. What is in memory right now

A snapshot after `const rex = new Dog("Rex")` in section 4. Notice the two chains. The top one is how `rex` finds methods. The bottom one is the second arrow that `extends` makes, from class to class.

```mermaid
graph LR
    R["rex with name and tricks"] -->|hidden link| DP["Dog.prototype with speak"]
    DP -->|hidden link| AP["Animal.prototype with speak"]
    AP -->|hidden link| OP["Object.prototype with toString"]
    D["Dog, a function"] -->|prototype| DP
    A["Animal, a function"] -->|prototype| AP
    D -->|hidden link of the class| A
```

### 2e. Right against wrong

**Wrong:** touching `this` before `super()` in a child class.

```mermaid
graph LR
    W1["Dog constructor starts and this is locked"] -->|this.tricks = 0| W2["ReferenceError and no object is made"]
```

**Right:** call `super()` first. The parent makes the object, then `this` works.

```mermaid
graph LR
    R1["Dog constructor starts and this is locked"] -->|super with name| R2["Animal makes the object"]
    R2 -->|this is unlocked| R3["this.tricks = 0 works"]
```

### 2f. A property against a private slot

Notice who can reach each one. Outside code has no name for the `#` slot, so it has no way in.

```mermaid
graph LR
    O["outside code"] -->|can read and change| P1["property _balance = 50"]
    M["methods written inside the class"] -->|can read and change| P2["private slot #balance = 50"]
    K["Object.keys and JSON.stringify"] -->|see only| P1
```

### 2g. The lost this

A method lives on the prototype, not inside the object. Notice what happens when you copy it out.

```mermaid
graph LR
    A["const f = c.inc"] -->|f gets| B["only the function"]
    B -->|f is called with no dot| C["this is undefined in strict mode"]
    C -->|this.count| D["TypeError"]
```

## 3. Real life analogy

Think of a chain of shops.

- Each shop (an instance) keeps its own stock (own properties).
- The how-to steps sit in **one** manual at head office (the prototype). Shops phone head office for a step.
- A sub-brand (a child class) has its own manual. For anything missing, it asks the parent brand's manual.
- The parent company must open a sub-brand shop first (`super()`). Only then can the shop fill its shelves (`this`).
- Each shop has a safe (a private slot). Only staff of that brand can open it.

Where the analogy stops:

- Real manuals get copied. In JavaScript there is truly one prototype object. Change it, and every instance sees the change.
- In JavaScript a child class **cannot** open the parent's `#` safe.

## 4. The smallest code that shows it

This is tab 2 of the stepper.

```js
class Animal {
  constructor(name) { this.name = name; }
  speak() { return this.name + " makes a sound"; }
}
class Dog extends Animal {
  constructor(name) { super(name); this.tricks = 0; }
  speak() { return super.speak() + ", woof"; }
}
const rex = new Dog("Rex");
console.log(rex.speak());
console.log(rex instanceof Animal);
```

**Output:**

```
Rex makes a sound, woof
true
```

And the private slot, tab 5 of the stepper. A **getter** (`get balance()`) is a method that runs when you read a property, with no brackets.

```js
class Account {
  #balance = 0;
  deposit(n) { this.#balance += n; }
  get balance() { return this.#balance; }
}
const a = new Account();
a.deposit(50);
console.log(a.balance);
console.log(a["#balance"], Object.keys(a).length);
```

**Output:**

```
50
undefined 0
```

## 5. What really happens, step by step

The first program from section 4.

| Step | Line | What JavaScript does | Call stack | Memory after | Prints |
|---|---|---|---|---|---|
| 1 | setup | Sets up the names `Animal`, `Dog` and `rex`. All three are **locked** until their line runs, like `let`. | main | only `Object.prototype` | |
| 2 | 1 to 4 | `class Animal` makes the function `Animal` and the object `Animal.prototype` holding `speak`. They point at each other. The lock on `Animal` opens. | main | Animal, Animal.prototype | |
| 3 | 5 | `class Dog extends Animal` makes `Dog` and `Dog.prototype`. `extends` adds **two** hidden links: `Dog.prototype` to `Animal.prototype`, and `Dog` to `Animal`. | main | + Dog, Dog.prototype | |
| 4 | 7 | Dog's `speak` goes on `Dog.prototype`. Now there are two `speak` functions. A dog finds Dog's first. (Interview word: *overriding*.) The lock on `Dog` opens. | main | same | |
| 5 | 9 | `new Dog("Rex")`. Dog is a child class, so `new` does **not** make the object. Dog's constructor starts with `this` **locked**. | main, Dog constructor | no object yet | |
| 6 | 6 | `super(name)` runs Animal's constructor. Animal has no `extends`, so **it** makes the empty object. Its hidden link goes to `Dog.prototype`, because `new` was called on `Dog`. | main, Dog constructor, Animal constructor | empty object, linked to Dog.prototype | |
| 7 | 2 | `this.name = name` writes `name = "Rex"` on the object. | same | object has name | |
| 8 | 6 | Animal's constructor ends. `this` is **unlocked** in Dog's constructor. `this.tricks = 0` runs. | main, Dog constructor | object has name, tricks | |
| 9 | 9 | Dog's constructor ends. `new` gives back the object. The lock on `rex` opens. | main | rex points at the object | |
| 10 | 10 | `rex.speak()`. `rex` has no own `speak`. JavaScript follows the hidden link to `Dog.prototype` and finds it. `this` is `rex`. | main, Dog speak | same | |
| 11 | 7 | `super.speak()` starts the search **one step up** from `Dog.prototype`, so at `Animal.prototype`. It runs Animal's `speak`, and `this` is still `rex`. | main, Dog speak, Animal speak | same | |
| 12 | 3, 7 | Animal's `speak` returns `"Rex makes a sound"`. Dog's `speak` adds `", woof"`. | main | same | Rex makes a sound, woof |
| 13 | 11 | `rex instanceof Animal` walks rex's chain. `Dog.prototype`? No. `Animal.prototype`? Yes. | main | same | true |

**Step through it yourself:** [open the classes stepper](visuals/08-classes.html). It shows your code, the names, the call stack, and the objects in memory with their arrows. It has six programs:

1. "A class is a function"
2. "extends and super()" (the program above)
3. "super() forgotten"
4. "Lost this and arrow fields"
5. "Private field #"
6. "instanceof walks the chain"

Type your guess in the box first, then press Next.

## 6. Why it exists and what it costs

- **Problem without it:** you wire prototypes by hand in five steps. A forgotten step gives a quiet bug (picture 2b). And `_balance` hides nothing.
- **How it solves it:**
  - One `class` line makes the function, the prototype object and the links.
  - `extends` makes the two links. `super()` runs the parent constructor. `super.speak()` runs the parent method.
  - A `#` field is really private.
  - Free safety rules: you must use `new`, the code is strict, and methods are hidden from `Object.keys` and `for...in` (interview word: *not enumerable*).
- **Cost:**
  - It is still prototypes underneath, so prototype bugs still happen.
  - **Lost `this`.** A shared method has no fixed `this`. An arrow field fixes it, but makes one function per instance.
  - **Long `extends` chains are hard to change.** A change in a parent can break every child. React now recommends function components over class components.
  - A `#` slot is hard to check in tests. A child class cannot read it either.

Simple rule: use a class when you make **many objects of one kind** that **keep their own data** and **share many methods**.

<details><summary>Go deeper (optional)</summary>

- **The second arrow, from class to class.** A method written with `static` is stored on the class itself, not on the prototype. For example, `static create() {}` is called as `Dog.create()`. Because `Dog` links to `Animal`, `Dog` also finds Animal's static methods. Built-in classes have them too, like `Array.from`.
- **When fields run.** In a parent class, fields run when the object is made, before the constructor body. In a child class, they run right after `super()` returns. That is one more reason `super()` comes first.
- **No constructor written?** A child class gets `constructor(...args) { super(...args); }` for free (stepper tab 6). A parent class gets an empty one.
- **The safety rules in detail.** `Dog("Rex")` without `new` throws `TypeError: Class constructor Dog cannot be invoked without 'new'`. The class name is locked until the class line runs, like `let` (lesson 01), so `new Late()` above `class Late {}` throws a `ReferenceError`. Methods written by hand on a prototype (lesson 07) do show up in `for...in`. Class methods do not.
- **Checking for a private slot.** Inside the class, `#balance in obj` gives `true` if `obj` has that slot. This is a safe check that does not throw.
- **instanceof only walks the chain.** It does not ask which constructor ran. If you change an object's hidden link with `Object.setPrototypeOf`, the answer changes (stepper tab 6).
- **`super` is fixed where the method is written.** Copying a method to another object does not change where `super` starts its search. `this` does change.

Checked on 2026-10-15 with Node 24.15.0. Every output and error name in this lesson came from a real run.

</details>

## 7. Common mistakes

**Wrong:** using `this` before `super()`.

```js
class Dog extends Animal {
  constructor(name) {
    this.tricks = 0;   // ReferenceError
    super(name);
  }
}
```

**Right:**

```js
class Dog extends Animal {
  constructor(name) {
    super(name);
    this.tricks = 0;
  }
}
```

**Why:** in a child class the parent constructor makes the object. Before `super()` returns, there is no object for `this` to be.

**Wrong:** passing a method around on its own.

```js
class Counter {
  count = 0;
  inc() { this.count++; }
}
const c = new Counter();
const inc = c.inc;
inc();   // TypeError: Cannot read properties of undefined (reading 'count')
```

**Right:** keep the object with the call. Pick one:

```js
const inc1 = () => c.inc();     // an arrow wrapper
const inc2 = c.inc.bind(c);     // bind, from lesson 06
// or write the method as an arrow field: inc = () => { this.count++; };
```

**Why:** `c.inc` gives only the function. With no dot at the call, `this` is `undefined`, because class code is strict. The arrow field works because each instance gets its own arrow function, which keeps `this`. That costs one function per instance.

**Wrong:** a child class reading the parent's private slot.

```js
class Account { #balance = 0; }
class Savings extends Account {
  read() { return this.#balance; }   // SyntaxError, the file does not even start
}
```

**Right:** the parent offers a getter, and the child uses it.

```js
class Account {
  #balance = 0;
  get balance() { return this.#balance; }
}
class Savings extends Account {
  read() { return this.balance; }
}
```

**Why:** a `#` name belongs only to the class body where it is written. It is not on the chain, so the child class does not get it.

**Wrong:** thinking `_balance` is private. It is a normal property. `Object.keys`, `JSON.stringify` and any outside code can see it and change it.

**Right:** use `#balance` when the data must stay inside.

## 8. Watch and play

Links checked on 2026-10-15. Each page opened. For each video, the title and channel matched, and the length came from the YouTube page. I did not watch the videos.

- **Video:** [The JavaScript SUPER keyword is super!](https://www.youtube.com/watch?v=Cto38GpvJgg) by Bro Code, about 9 minutes. Watch it after tab 2 of the stepper.
- **Video:** [ES2022: Class Private Fields and Methods](https://www.youtube.com/watch?v=dwfUJRbGXX0) by All Things JavaScript, about 10 minutes. Watch it after tab 5.
- **Play with it:** [The classes stepper](visuals/08-classes.html) in this folder. Guess first, then press Next.
- **Play with it:** [Python Tutor for JavaScript](https://pythontutor.com/javascript.html). Paste the first program from section 4. Its [guide](https://pythontutor.com/articles/javascript-visualizer.html) says it draws classes, but runs only ES6 code, so fields like `count = 0` and `#balance` fail there.
- **Read:** [Class basic syntax](https://javascript.info/class) on javascript.info. The picture in "What is a class?" is picture 2a.
- **Read:** [Class inheritance](https://javascript.info/class-inheritance) on javascript.info. The picture in "The extends keyword" is picture 2d.
- **Read:** [Private elements on MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_properties). Read the first two sections.

<details><summary>More links (optional)</summary>

- **Video:** [Javascript Classes Explained](https://www.youtube.com/watch?v=5fmifZZeJJ4) by Dave Gray, about 31 minutes. Longer. It also compares classes with functions that return objects (factory functions).
- **Read:** [Using classes on MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_classes). The section "Why classes?" says when a class is a good fit.
- **Read:** [super on MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/super). The example says "Moving this to the top causes a ReferenceError."
- **Read:** [What are the differences between JavaScript ES2015 classes and ES5 function constructors?](https://greatfrontend.com/questions/quiz/what-are-the-differences-between-es6-class-and-es5-function-constructors) on GreatFrontEnd. A common interview question, with both versions side by side.
- **Read:** [Component on react.dev](https://react.dev/reference/react/Component). The first warning says "We recommend defining components as functions instead of classes."

</details>

## 9. Practice

**A. Predict the output** (write your answer before opening)

```js
class Shape {
  constructor() { this.sides = 0; }
  describe() { return "I have " + this.sides + " sides"; }
}
class Square extends Shape {
  constructor() { super(); this.sides = 4; }
}
const s = new Square();
console.log(s.describe());
console.log(Object.keys(s));
console.log(s instanceof Shape, Object.hasOwn(s, "describe"));
```

<details><summary>Answer</summary>

```
I have 4 sides
[ 'sides' ]
true false
```

- `super()` runs Shape's constructor first and writes `sides = 0`. Then Square's constructor changes it to 4.
- There is one own property, `sides`. `describe` lives on `Shape.prototype`, so it is not own, and `Object.keys` does not list it.
- `Shape.prototype` is on the chain of `s`, so `instanceof` gives `true`.

</details>

**B. Fix the bug**

```js
class Cart {
  items = [];
  add(item) { this.items.push(item); }
}
const cart = new Cart();
["apple", "pear"].forEach(cart.add);   // TypeError
console.log(cart.items);               // should be [ 'apple', 'pear' ]
```

<details><summary>Answer</summary>

`forEach(cart.add)` passes only the function. `forEach` calls it with no dot, so `this` is `undefined`. Then `this.items` throws `TypeError: Cannot read properties of undefined (reading 'items')`.

Keep the object with the call:

```js
["apple", "pear"].forEach(item => cart.add(item));
console.log(cart.items);   // [ 'apple', 'pear' ]
```

`forEach(cart.add.bind(cart))` also works. So does writing `add` as an arrow field.

</details>

**C. Write it yourself**

Open `practice/08-classes.js`. There are four tasks:

1. Fix two bugs in a child class `Dog`.
2. Write a `Wallet` class with a private `#` balance, `deposit`, `withdraw` and a `balance` getter.
3. Write `LimitedWallet extends Wallet`, which uses `super` in two places.
4. Write down what six snippets print.

Run the tests from the folder that contains `learn/`:

```
node --test learn/javascript/practice/08-classes.test.js
```

At the start, all 23 tests fail. When you fix the first bug in `Dog`, the second one shows up.

<details><summary>One possible answer</summary>

```js
class Dog extends Animal {
  constructor(name, tricks) {
    super(name);                 // bug 1: super first, then this
    this.tricks = tricks;
  }
  describe() {
    // bug 2: this.describe() called itself forever (RangeError). super starts one step up.
    return super.describe() + " and knows " + this.tricks + " tricks";
  }
}

class Wallet {
  #balance;
  constructor(start = 0) { this.#balance = start; }
  deposit(n) { this.#balance += n; return this.#balance; }
  withdraw(n) {
    if (n > this.#balance) throw new Error("Not enough money");
    this.#balance -= n;
    return this.#balance;
  }
  get balance() { return this.#balance; }
}

class LimitedWallet extends Wallet {
  constructor(limit, start = 0) {
    super(start);                // the parent makes the object and its # slot
    this.limit = limit;
  }
  withdraw(n) {
    if (n > this.limit) throw new Error("Over the limit");
    return super.withdraw(n);    // the parent's rules still run
  }
}

const predictions = {
  s1: ["function", "0", "true"],
  s2: ["TypeError"],
  s3: ["x,y", "true"],
  s4: ["TypeError", "5"],
  s5: ["true", "undefined", "{}"],
  s6: ["BA", "A"],
};
```

Why `LimitedWallet` cannot read `#balance`: the `#` name belongs to the body of `Wallet`. So it uses `super.withdraw` and the `balance` getter instead.

</details>

## 10. Interview question

**Q:** "Are classes in JavaScript just syntax sugar? What does a class really make, and what do `extends` and `super` do?"

<details><summary>A strong answer, in four parts</summary>

1. **Problem:** you need many objects of one kind. Each keeps its own data, and all share the same methods. Some kinds also need a parent's methods. Wiring prototypes by hand for this takes many steps and is easy to get wrong.
2. **How it works:**
   - A class makes a function plus one prototype object that holds the methods. `new` makes an instance with a hidden link to that object.
   - `extends` makes two links. The child prototype links to the parent prototype, for methods. The child class links to the parent class, for static methods.
   - In a child class, the parent constructor makes the object. So `super()` must run before `this`.
   - `super.method()` starts the search one step above the method's own prototype, and keeps the same `this`.
   - A `#` field is a private slot that only code inside the class body can reach.
3. **Tradeoff:** mostly sugar, but not only. You must call it with `new`, the code is always strict, methods are not enumerable, and `#` fields and `super()` have no simple old version. Costs: methods lose `this` when passed around. Arrow fields fix that, but cost one function per instance. Deep `extends` chains are hard to change, and React now recommends function components over class components.
4. **My example:**
   - *A fact about your tools:* Prisma code starts with `const prisma = new PrismaClient()`. `PrismaClient` is a class, and your app makes one instance of it.
   - *An idea, not a fact. Replace it with a real story:* in the Skyworx loan systems, a custom error such as `class LoanRuleError extends Error` would let a `catch` block use `err instanceof LoanRuleError` to tell a rule failure from a crash.

</details>

## 11. Explain it back

Close this file. Press the **Record my explanation** button under this heading and explain classes out loud, like to a new junior, in 4 parts: problem, how it works, tradeoff, my example. Use the words "prototype object", "hidden link", "instance" and "super". Then save the transcript file into `my-learning/recordings/`, or write your best version below. Run `/explain-check classes` or ask the `explain-coach` agent to review it.

### My explanation

<write here>

### Coach feedback

<the explain-coach agent writes here>

## 12. Review questions (day 1, 3, 7, 21)

1. What two objects does `class Dog { bark() {} }` make? Where does `bark` live?
2. In a child class, why must `super()` run before you use `this`?
3. What is the difference between `_balance` and `#balance`?
4. Draw the picture from section 2d from memory: `rex`, the two prototypes, the two classes, and every arrow.

<details><summary>Answers</summary>

1. A function `Dog`, and one object `Dog.prototype`. `bark` lives once on `Dog.prototype`. Every instance has a hidden link to it, so they all share one `bark`.
2. In a child class, `new` does not make the object. The parent constructor makes it when `super()` runs. Before that, `this` is locked, and using it throws a `ReferenceError`.
3. `_balance` is a normal property. Anyone can read it and change it, and `Object.keys` lists it. `#balance` is a private slot. Only code inside the class body can reach it. Outside code that writes `obj.#balance` is a `SyntaxError`.
4. `rex` links to `Dog.prototype`, which links to `Animal.prototype`, which links to `Object.prototype`. `Dog` points to `Dog.prototype` and `Animal` points to `Animal.prototype`. `Dog` also has a hidden link to `Animal`.

</details>

## Connected lessons

- [Objects and prototypes](07-objects-and-prototypes.md): the hidden links a class builds for you.
- [this, call, apply and bind](06-this-call-apply-and-bind.md): why a copied method loses `this`.
- [Closures](05-closures.md): the older way to hide data, in a scope box instead of a `#` slot.
- [Variables, scope and hoisting](01-variables-scope-and-hoisting.md): a class name is locked until its line runs, like `let`.
- [Arrays and higher order functions](09-arrays-and-higher-order-functions.md): the next lesson. Practice B passes a method to `forEach`.
