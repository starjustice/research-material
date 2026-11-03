// Small pure helpers for the lesson quiz (viewer.html, quiz.js, progress.html). No DOM here, so node:test can run them (tests/quiz-helpers.test.js).
// A quiz file is a JSON list: [{ "q": "...", "options": ["a", "b", "c", "d"], "answer": 1, "why": "...", "code": "optional" }]
(function () {
  const STORE_KEY = "ailearner-quiz-v1";
  const MAX_ATTEMPTS = 20;

  // A question keeps its id when it is moved in the list. Editing its text starts a new history for it.
  function questionId(text) {
    let h = 5381;
    for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
    return h.toString(36);
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
      if (!Array.isArray(item.options) || item.options.length < 2 || item.options.length > 5) problems.push(at + ": needs 2 to 5 options");
      else {
        if (item.options.some(o => typeof o !== "string" || !o.trim())) problems.push(at + ": an option is empty");
        if (new Set(item.options).size !== item.options.length) problems.push(at + ": two options are the same");
        if (!Number.isInteger(item.answer) || item.answer < 0 || item.answer >= item.options.length) problems.push(at + ": answer is not an option number");
      }
      if (typeof item.why !== "string" || !item.why.trim()) problems.push(at + ": why is empty");
      if (item.code !== undefined && typeof item.code !== "string") problems.push(at + ": code must be text");
    });
    return problems;
  }

  // The order to show n options in: a list of the original positions. rng returns a number from 0 up to 1.
  function shuffledOrder(n, rng = Math.random) {
    const order = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
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

  const api = { STORE_KEY, questionId, validateQuiz, shuffledOrder, percent, levelOf, emptyStore, normalizeStore, recordAttempt, summarizeLesson, weakQuestions, overview };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.QuizHelpers = api;
})();
