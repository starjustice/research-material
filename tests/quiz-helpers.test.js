const test = require("node:test");
const assert = require("node:assert");
const Q = require("../quiz-helpers");

const good = () => [{ q: "What is 1+1?", options: ["1", "2", "3"], answer: 1, why: "Because it is two." }];

test("questionId is stable and differs for different text", () => {
  assert.strictEqual(Q.questionId("abc"), Q.questionId("abc"));
  assert.notStrictEqual(Q.questionId("abc"), Q.questionId("abd"));
});

test("validateQuiz accepts a good quiz", () => {
  assert.deepStrictEqual(Q.validateQuiz(good()), []);
});

test("validateQuiz names each problem", () => {
  assert.match(Q.validateQuiz([])[0], /non-empty/);
  const bad = (patch) => Q.validateQuiz([{ ...good()[0], ...patch }]).join(" | ");
  assert.match(bad({ answer: 3 }), /answer/);
  assert.match(bad({ answer: "1" }), /answer/);
  assert.match(bad({ options: ["only"] }), /2 to 5/);
  assert.match(bad({ options: ["a", "a"] }), /same/);
  assert.match(bad({ options: ["a", ""] }), /empty/);
  assert.match(bad({ why: " " }), /why/);
  assert.match(bad({ q: "" }), /q is empty/);
  assert.match(bad({ code: 5 }), /code/);
  const twice = good().concat(good());
  assert.match(Q.validateQuiz(twice).join(), /same question/);
});

test("shuffledOrder is a permutation and follows the random numbers", () => {
  assert.deepStrictEqual(Q.shuffledOrder(4, () => 0.999).sort(), [0, 1, 2, 3]);
  assert.deepStrictEqual(Q.shuffledOrder(4, () => 0.999), [0, 1, 2, 3]); // j is always i: nothing moves
  assert.deepStrictEqual(Q.shuffledOrder(3, () => 0), [1, 2, 0]);
  assert.deepStrictEqual(Q.shuffledOrder(0), []);
});

test("percent and levelOf", () => {
  assert.strictEqual(Q.percent(4, 5), 80);
  assert.strictEqual(Q.percent(1, 3), 33);
  assert.strictEqual(Q.percent(0, 0), 0);
  assert.strictEqual(Q.levelOf(80), "strong");
  assert.strictEqual(Q.levelOf(79), "ok");
  assert.strictEqual(Q.levelOf(60), "ok");
  assert.strictEqual(Q.levelOf(59), "weak");
});

test("normalizeStore throws away anything that is not a v1 store", () => {
  assert.deepStrictEqual(Q.normalizeStore(null), Q.emptyStore());
  assert.deepStrictEqual(Q.normalizeStore({ v: 2, lessons: {} }), Q.emptyStore());
  assert.deepStrictEqual(Q.normalizeStore({ v: 1, lessons: 5 }), Q.emptyStore());
});

test("recordAttempt saves the score and each question, without changing the old store", () => {
  const before = Q.emptyStore();
  const after = Q.recordAttempt(before, "learn/database/02-joins", "Joins",
    [{ q: "A", correct: true }, { q: "B", correct: false }], 1000);
  assert.deepStrictEqual(before, Q.emptyStore());
  const lesson = after.lessons["learn/database/02-joins"];
  assert.deepStrictEqual(lesson.attempts, [{ t: 1000, score: 1, total: 2 }]);
  assert.deepStrictEqual(lesson.questions[Q.questionId("A")], { q: "A", right: 1, wrong: 0, lastRight: true });
  assert.deepStrictEqual(lesson.questions[Q.questionId("B")], { q: "B", right: 0, wrong: 1, lastRight: false });
});

test("recordAttempt adds up over tries and keeps only the last 20 attempts", () => {
  let s = Q.emptyStore();
  for (let i = 0; i < 25; i++) s = Q.recordAttempt(s, "x", "X", [{ q: "A", correct: i % 2 === 0 }], i);
  assert.strictEqual(s.lessons.x.attempts.length, 20);
  assert.strictEqual(s.lessons.x.attempts[0].t, 5);
  const a = s.lessons.x.questions[Q.questionId("A")];
  assert.strictEqual(a.right + a.wrong, 25);
  assert.strictEqual(a.lastRight, true);
});

test("a partial attempt updates the questions but adds no attempt", () => {
  let s = Q.recordAttempt(Q.emptyStore(), "x", "X", [{ q: "A", correct: false }, { q: "B", correct: true }], 1);
  s = Q.recordAttempt(s, "x", "X", [{ q: "A", correct: true }], 2, { partial: true });
  assert.strictEqual(s.lessons.x.attempts.length, 1);
  assert.deepStrictEqual(s.lessons.x.questions[Q.questionId("A")], { q: "A", right: 1, wrong: 1, lastRight: true });
});

test("summarizeLesson gives last, best, tries and the change", () => {
  assert.strictEqual(Q.summarizeLesson(undefined), null);
  assert.strictEqual(Q.summarizeLesson({ attempts: [] }), null);
  let s = Q.emptyStore();
  s = Q.recordAttempt(s, "x", "X", [{ q: "A", correct: true }, { q: "B", correct: true }, { q: "C", correct: false }, { q: "D", correct: false }], 1);
  s = Q.recordAttempt(s, "x", "X", [{ q: "A", correct: true }, { q: "B", correct: true }, { q: "C", correct: true }, { q: "D", correct: false }], 2);
  s = Q.recordAttempt(s, "x", "X", [{ q: "A", correct: true }, { q: "B", correct: false }, { q: "C", correct: false }, { q: "D", correct: false }], 3);
  const sum = Q.summarizeLesson(s.lessons.x);
  assert.strictEqual(sum.tries, 3);
  assert.strictEqual(sum.lastPct, 25);
  assert.strictEqual(sum.bestPct, 75);
  assert.strictEqual(sum.change, -50);
  assert.strictEqual(sum.level, "weak");
});

test("weakQuestions lists questions whose latest answer was wrong, most missed first", () => {
  let s = Q.emptyStore();
  s = Q.recordAttempt(s, "a", "A", [{ q: "one", correct: false }, { q: "two", correct: false }, { q: "three", correct: true }]);
  s = Q.recordAttempt(s, "a", "A", [{ q: "one", correct: false }, { q: "two", correct: true }, { q: "three", correct: true }]);
  const weak = Q.weakQuestions(s);
  assert.deepStrictEqual(weak.map(w => w.q), ["one"]);
  assert.strictEqual(weak[0].wrong, 2);
  assert.strictEqual(Q.weakQuestions(s, 0).length, 0);
});

test("overview counts tried lessons, the average of the last scores, and answers given", () => {
  const manifest = [{ slug: "a" }, { slug: "b" }, { slug: "c" }];
  assert.deepStrictEqual(Q.overview(Q.emptyStore(), manifest), { lessonsTotal: 3, lessonsTried: 0, answered: 0, average: null });
  let s = Q.recordAttempt(Q.emptyStore(), "a", "A", [{ q: "1", correct: true }, { q: "2", correct: true }]);
  s = Q.recordAttempt(s, "b", "B", [{ q: "1", correct: true }, { q: "2", correct: false }]);
  s = Q.recordAttempt(s, "zzz", "Not in the list", [{ q: "1", correct: true }]);
  assert.deepStrictEqual(Q.overview(s, manifest), { lessonsTotal: 3, lessonsTried: 2, answered: 4, average: 75 });
});

// ---- question types: single (default), multi, tf, order, fill ----

const one = (extra) => [{ q: "Q?", why: "Because.", ...extra }];
const problems = (extra) => Q.validateQuiz(one(extra)).join(" | ");

test("a question without a type is a single choice question", () => {
  assert.strictEqual(Q.questionType(good()[0]), "single");
  assert.strictEqual(Q.questionType({ type: "tf" }), "tf");
});

test("validateQuiz accepts one good question of every type", () => {
  assert.deepStrictEqual(problems({ type: "single", options: ["a", "b"], answer: 0 }), "");
  assert.deepStrictEqual(problems({ type: "multi", options: ["a", "b", "c"], answer: [0, 2] }), "");
  assert.deepStrictEqual(problems({ type: "tf", answer: false }), "");
  assert.deepStrictEqual(problems({ type: "order", items: ["one", "two", "three"] }), "");
  assert.deepStrictEqual(problems({ type: "fill", answer: "a b" }), "");
  assert.deepStrictEqual(problems({ type: "fill", answer: ["a b", "a, b"] }), "");
});

test("validateQuiz names the problems of the new types", () => {
  assert.match(problems({ type: "poll", options: ["a", "b"], answer: 0 }), /type/);
  assert.match(problems({ type: "multi", options: ["a", "b", "c"], answer: 1 }), /answer/);
  assert.match(problems({ type: "multi", options: ["a", "b", "c"], answer: [] }), /answer/);
  assert.match(problems({ type: "multi", options: ["a", "b", "c"], answer: [1, 1] }), /answer/);
  assert.match(problems({ type: "multi", options: ["a", "b", "c"], answer: [5] }), /answer/);
  assert.match(problems({ type: "multi", options: ["a", "b"], answer: [0] }), /3 to 6/);
  assert.match(problems({ type: "tf", answer: "true" }), /true or false/);
  assert.match(problems({ type: "order", items: ["one", "two"] }), /3 to 6/);
  assert.match(problems({ type: "order", items: ["one", "two", "two"] }), /same/);
  assert.match(problems({ type: "order", items: ["one", "", "three"] }), /empty/);
  assert.match(problems({ type: "fill", answer: "" }), /answer/);
  assert.match(problems({ type: "fill", answer: [] }), /answer/);
  assert.match(problems({ type: "fill", answer: 5 }), /answer/);
});

test("normalizeText ignores extra spaces and line breaks, but keeps letter case", () => {
  assert.strictEqual(Q.normalizeText("  a   d\n c\tb "), "a d c b");
  assert.notStrictEqual(Q.normalizeText("A"), Q.normalizeText("a"));
  assert.strictEqual(Q.normalizeText(undefined), "");
});

test("checkAnswer for single, tf, multi, order and fill", () => {
  assert.strictEqual(Q.checkAnswer(good()[0], 1), true);
  assert.strictEqual(Q.checkAnswer(good()[0], 0), false);

  const tf = { type: "tf", answer: false };
  assert.strictEqual(Q.checkAnswer(tf, false), true);
  assert.strictEqual(Q.checkAnswer(tf, true), false);

  const multi = { type: "multi", options: ["a", "b", "c", "d"], answer: [2, 0] };
  assert.strictEqual(Q.checkAnswer(multi, [0, 2]), true, "order of the picks does not matter");
  assert.strictEqual(Q.checkAnswer(multi, [2, 0]), true);
  assert.strictEqual(Q.checkAnswer(multi, [0]), false, "a missed option is wrong");
  assert.strictEqual(Q.checkAnswer(multi, [0, 2, 3]), false, "an extra option is wrong");
  assert.strictEqual(Q.checkAnswer(multi, []), false);

  const order = { type: "order", items: ["x", "y", "z"] };
  assert.strictEqual(Q.checkAnswer(order, [0, 1, 2]), true);
  assert.strictEqual(Q.checkAnswer(order, [0, 2, 1]), false);
  assert.strictEqual(Q.checkAnswer(order, [0, 1]), false, "a half finished order is wrong");

  const fill = { type: "fill", answer: ["z y x", "z, y, x"] };
  assert.strictEqual(Q.checkAnswer(fill, "z y x"), true);
  assert.strictEqual(Q.checkAnswer(fill, " z   y\nx "), true);
  assert.strictEqual(Q.checkAnswer(fill, "z, y, x"), true);
  assert.strictEqual(Q.checkAnswer(fill, "z x y"), false);
  assert.strictEqual(Q.checkAnswer(fill, "Z Y X"), false);
  assert.strictEqual(Q.checkAnswer(fill, ""), false);
});

test("correctText gives one readable line for the answer", () => {
  assert.strictEqual(Q.correctText(good()[0]), "2");
  assert.strictEqual(Q.correctText({ type: "tf", answer: true }), "True");
  assert.strictEqual(Q.correctText({ type: "tf", answer: false }), "False");
  assert.strictEqual(Q.correctText({ type: "multi", options: ["a", "b", "c"], answer: [2, 0] }), "a; c");
  assert.strictEqual(Q.correctText({ type: "order", items: ["x", "y", "z"] }), "x → y → z");
  assert.strictEqual(Q.correctText({ type: "fill", answer: ["z y x", "z, y, x"] }), "z y x");
  assert.strictEqual(Q.correctText({ type: "fill", answer: "z y x" }), "z y x");
});

test("shuffledOrder never shows an order question already solved when asked not to", () => {
  // rng 0.999 never moves anything, so the plain shuffle would give the solved order
  assert.deepStrictEqual(Q.shuffledOrder(4, () => 0.999, { notSorted: true }), [1, 2, 3, 0]);
  assert.deepStrictEqual(Q.shuffledOrder(3, () => 0, { notSorted: true }), [1, 2, 0]);
  assert.deepStrictEqual(Q.shuffledOrder(4, () => 0.999), [0, 1, 2, 3], "without the option it is unchanged");
});
