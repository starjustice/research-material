// Small pure helpers for the lesson quiz (viewer.html, quiz.js, progress.html). No DOM here, so node:test can run them (tests/quiz-helpers.test.js).
// A quiz file is a JSON list of questions. Every question has "q" and "why", and may have "code" (shown under the question).
// The "type" says what kind of question it is. No "type" means "single", so older quiz files keep working.
//   single  pick one          { options: ["a","b","c"], answer: 1 }
//   multi   pick all that fit { type: "multi", options: ["a","b","c","d"], answer: [0, 2] }
//   tf      true or false     { type: "tf", answer: false }
//   order   put in order      { type: "order", items: ["first","second","third"] }   items are written in the RIGHT order, the page shuffles them
//   fill    type the answer   { type: "fill", answer: "z y x" }   or a list of accepted answers. Spaces and line breaks do not matter, letter case does.
(function () {
  const STORE_KEY = "ailearner-quiz-v1";
  const MAX_ATTEMPTS = 20;

  // A question keeps its id when it is moved in the list. Editing its text starts a new history for it.
  function questionId(text) {
    let h = 5381;
    for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  const TYPES = ["single", "multi", "tf", "order", "fill"];
  const questionType = (item) => (item && item.type) || "single";
  const isText = (x) => typeof x === "string" && x.trim() !== "";

  // Extra spaces, tabs and line breaks do not count. Letter case does (in JavaScript "A" and "a" are different).
  const normalizeText = (s) => String(s == null ? "" : s).trim().replace(/\s+/g, " ");

  // The answers a "fill" question accepts, as a list.
  const acceptedAnswers = (item) => (Array.isArray(item.answer) ? item.answer : [item.answer]);

  function optionProblems(item, at, min, max) {
    if (!Array.isArray(item.options) || item.options.length < min || item.options.length > max) return [at + ": needs " + min + " to " + max + " options"];
    const out = [];
    if (item.options.some(o => !isText(o))) out.push(at + ": an option is empty");
    if (new Set(item.options).size !== item.options.length) out.push(at + ": two options are the same");
    return out;
  }

  // Problems of the part of a question that depends on its type.
  function typeProblems(item, at) {
    const type = questionType(item);
    if (!TYPES.includes(type)) return [at + ": type must be one of " + TYPES.join(", ")];
    if (type === "single") {
      const out = optionProblems(item, at, 2, 5);
      if (Array.isArray(item.options) && (!Number.isInteger(item.answer) || item.answer < 0 || item.answer >= item.options.length)) out.push(at + ": answer is not an option number");
      return out;
    }
    if (type === "multi") {
      const out = optionProblems(item, at, 3, 6);
      const a = item.answer;
      const good = Array.isArray(a) && a.length > 0 && new Set(a).size === a.length &&
        a.every(n => Number.isInteger(n) && n >= 0 && Array.isArray(item.options) && n < item.options.length);
      if (!good) out.push(at + ": answer must be a list of different option numbers");
      return out;
    }
    if (type === "tf") return typeof item.answer === "boolean" ? [] : [at + ": answer must be true or false"];
    if (type === "order") {
      if (!Array.isArray(item.items) || item.items.length < 3 || item.items.length > 6) return [at + ": needs 3 to 6 items"];
      const out = [];
      if (item.items.some(o => !isText(o))) out.push(at + ": an item is empty");
      if (new Set(item.items).size !== item.items.length) out.push(at + ": two items are the same");
      return out;
    }
    // fill
    const list = Array.isArray(item.answer) ? item.answer : [item.answer];
    return list.length > 0 && list.every(isText) ? [] : [at + ": answer must be text, or a list of texts"];
  }

  // Returns a list of problems (empty when the quiz file is good).
  function validateQuiz(list) {
    if (!Array.isArray(list) || list.length === 0) return ["the quiz must be a non-empty list"];
    const problems = [];
    const seen = new Set();
    list.forEach((item, i) => {
      const at = "question " + (i + 1);
      if (!item || typeof item !== "object") return problems.push(at + ": not an object");
      if (typeof item.q !== "string" || !item.q.trim()) problems.push(at + ": q is empty");
      else if (seen.has(item.q)) problems.push(at + ": same question text as another one");
      else seen.add(item.q);
      problems.push(...typeProblems(item, at));
      if (typeof item.why !== "string" || !item.why.trim()) problems.push(at + ": why is empty");
      if (item.code !== undefined && typeof item.code !== "string") problems.push(at + ": code must be text");
    });
    return problems;
  }

  // response is what the learner chose, by type:
  //   single: the option number. multi: a list of option numbers. tf: true or false.
  //   order: the item numbers in the order the learner picked them (item numbers are positions in the right order). fill: the typed text.
  function checkAnswer(item, response) {
    switch (questionType(item)) {
      case "multi": {
        if (!Array.isArray(response)) return false;
        const picked = new Set(response);
        return picked.size === item.answer.length && item.answer.every(n => picked.has(n));
      }
      case "order":
        return Array.isArray(response) && response.length === item.items.length && response.every((n, i) => n === i);
      case "fill":
        return acceptedAnswers(item).some(a => normalizeText(a) === normalizeText(response));
      default: // single and tf
        return response === item.answer;
    }
  }

  // The right answer as one readable line ("Answer: ...").
  function correctText(item) {
    switch (questionType(item)) {
      case "multi": return [...item.answer].sort((a, b) => a - b).map(n => item.options[n]).join("; ");
      case "tf": return item.answer ? "True" : "False";
      case "order": return item.items.join(" → ");
      case "fill": return acceptedAnswers(item)[0];
      default: return item.options[item.answer];
    }
  }

  // The order to show n options in: a list of the original positions. rng returns a number from 0 up to 1.
  // notSorted: for an "order" question, never show the right order. If the shuffle lands on it, move the first one to the end.
  function shuffledOrder(n, rng = Math.random, { notSorted = false } = {}) {
    const order = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (notSorted && n > 1 && order.every((v, i) => v === i)) order.push(order.shift());
    return order;
  }

  const percent = (score, total) => (total > 0 ? Math.round((score / total) * 100) : 0);

  // strong from 80%, ok from 60%, weak below that.
  function levelOf(pct) {
    return pct >= 80 ? "strong" : pct >= 60 ? "ok" : "weak";
  }

  const emptyStore = () => ({ v: 1, lessons: {} });

  function normalizeStore(raw) {
    if (!raw || typeof raw !== "object" || raw.v !== 1 || !raw.lessons || typeof raw.lessons !== "object") return emptyStore();
    return raw;
  }

  // answers: [{ q: "question text", correct: true|false }]. Returns a new store and leaves the old one alone.
  // partial: true is for "retry the ones I missed". It updates each question but adds no attempt, so the lesson score stays a score of the whole quiz.
  function recordAttempt(store, slug, title, answers, now = Date.now(), { partial = false } = {}) {
    const next = JSON.parse(JSON.stringify(normalizeStore(store)));
    const lesson = next.lessons[slug] || (next.lessons[slug] = { title, attempts: [], questions: {} });
    lesson.title = title;
    if (!partial) {
      const score = answers.filter(a => a.correct).length;
      lesson.attempts.push({ t: now, score, total: answers.length });
      if (lesson.attempts.length > MAX_ATTEMPTS) lesson.attempts = lesson.attempts.slice(-MAX_ATTEMPTS);
    }
    for (const a of answers) {
      const id = questionId(a.q);
      const rec = lesson.questions[id] || (lesson.questions[id] = { q: a.q, right: 0, wrong: 0, lastRight: false });
      rec.q = a.q;
      if (a.correct) rec.right++; else rec.wrong++;
      rec.lastRight = !!a.correct;
    }
    return next;
  }

  // The numbers to show for one lesson. null when the lesson was never tried.
  function summarizeLesson(rec) {
    if (!rec || !rec.attempts || rec.attempts.length === 0) return null;
    const last = rec.attempts[rec.attempts.length - 1];
    const best = rec.attempts.reduce((b, a) => (percent(a.score, a.total) > percent(b.score, b.total) ? a : b));
    const prev = rec.attempts.length > 1 ? rec.attempts[rec.attempts.length - 2] : null;
    const lastPct = percent(last.score, last.total);
    return {
      tries: rec.attempts.length, last, best, lastPct, bestPct: percent(best.score, best.total),
      level: levelOf(lastPct), change: prev ? lastPct - percent(prev.score, prev.total) : null,
    };
  }

  // Questions whose latest answer was wrong, the most missed first.
  function weakQuestions(store, limit = 10) {
    const out = [];
    for (const [slug, lesson] of Object.entries(normalizeStore(store).lessons)) {
      for (const [id, q] of Object.entries(lesson.questions || {})) {
        if (!q.lastRight) out.push({ slug, title: lesson.title, id, q: q.q, wrong: q.wrong, right: q.right });
      }
    }
    out.sort((a, b) => b.wrong - a.wrong || a.slug.localeCompare(b.slug));
    return out.slice(0, limit);
  }

  // Totals for the top of the progress page. manifest is the list in quiz-index.json.
  function overview(store, manifest) {
    const lessons = normalizeStore(store).lessons;
    const tried = manifest.filter(m => summarizeLesson(lessons[m.slug]));
    const lastPcts = tried.map(m => summarizeLesson(lessons[m.slug]).lastPct);
    let answered = 0;
    for (const m of manifest) for (const q of Object.values((lessons[m.slug] || {}).questions || {})) answered += q.right + q.wrong;
    return {
      lessonsTotal: manifest.length, lessonsTried: tried.length, answered,
      average: lastPcts.length ? Math.round(lastPcts.reduce((a, b) => a + b, 0) / lastPcts.length) : null,
    };
  }

  const api = { STORE_KEY, TYPES, questionId, questionType, normalizeText, validateQuiz, checkAnswer, correctText, shuffledOrder, percent, levelOf, emptyStore, normalizeStore, recordAttempt, summarizeLesson, weakQuestions, overview };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.QuizHelpers = api;
})();
