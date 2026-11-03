// The quiz card inside a lesson (viewer.html). Needs quiz-helpers.js first.
// Quiz.mount(box, { slug, title, questions }) draws one question at a time, marks each answer at once, and saves the score in this browser.
(function () {
  const H = window.QuizHelpers;

  function loadStore() {
    try { return H.normalizeStore(JSON.parse(localStorage.getItem(H.STORE_KEY))); } catch (e) { return H.emptyStore(); }
  }
  // Returns false when the browser refuses to save (private window, storage full).
  function saveStore(store) {
    try { localStorage.setItem(H.STORE_KEY, JSON.stringify(store)); return true; } catch (e) { return false; }
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // `code` in a question becomes a code word. Everything goes in as text, never as HTML.
  function fill(node, text) {
    text.split("`").forEach((part, i) => {
      if (!part) return;
      node.appendChild(i % 2 ? el("code", "", part) : document.createTextNode(part));
    });
    return node;
  }

  function mount(box, { slug, title, questions }) {
    let store = loadStore();
    let saveFailed = false;

    function lastLine() {
      const sum = H.summarizeLesson(store.lessons[slug]);
      const p = el("p", "quiz-last");
      if (!sum) {
        p.textContent = "You have not tried this quiz yet. " + questions.length + " questions, about 3 minutes. ";
      } else {
        p.textContent = "Last: " + sum.last.score + "/" + sum.last.total + " (" + sum.lastPct + "%) · Best: " + sum.bestPct + "% · Tried " + sum.tries + (sum.tries === 1 ? " time. " : " times. ");
      }
      const a = el("a", "", "All my scores →");
      a.href = "progress.html";
      p.appendChild(a);
      return p;
    }

    function showStart() {
      box.replaceChildren(lastLine());
      const btn = el("button", "quiz-btn primary", H.summarizeLesson(store.lessons[slug]) ? "Take the quiz again" : "Start the quiz");
      btn.type = "button";
      btn.addEventListener("click", () => run(questions, false));
      box.appendChild(btn);
    }

    // One run through a list of questions. partial = a retry of the missed ones (does not count as a lesson score).
    function run(list, partial) {
      const results = [];
      let i = 0;

      function ask() {
        const item = list[i];
        box.replaceChildren();
        const bar = el("div", "quiz-bar");
        const fillBar = el("i");
        fillBar.style.width = Math.round((i / list.length) * 100) + "%";
        bar.appendChild(fillBar);
        box.appendChild(bar);
        box.appendChild(el("p", "quiz-count", (partial ? "Retry · " : "") + "Question " + (i + 1) + " of " + list.length));
        box.appendChild(fill(el("p", "quiz-q"), item.q));
        if (item.code) box.appendChild(el("pre", "quiz-code", item.code));

        const opts = el("div", "quiz-options");
        opts.setAttribute("role", "group");
        const feedback = el("div", "quiz-why");
        feedback.setAttribute("aria-live", "polite");
        const next = el("button", "quiz-btn primary", i === list.length - 1 ? "See my score" : "Next question");
        next.type = "button";
        next.hidden = true;
        next.addEventListener("click", () => { i++; if (i < list.length) ask(); else finish(); });

        const order = H.shuffledOrder(item.options.length);
        const buttons = order.map(orig => {
          const b = el("button", "quiz-opt");
          b.type = "button";
          fill(b, item.options[orig]);
          b.addEventListener("click", () => {
            const correct = orig === item.answer;
            results.push({ q: item.q, correct, item });
            buttons.forEach((other, k) => {
              other.disabled = true;
              if (order[k] === item.answer) other.classList.add("right");
            });
            if (!correct) b.classList.add("wrong");
            feedback.replaceChildren(el("b", "", correct ? "✅ Right. " : "❌ Not quite. "), fill(el("span"), item.why));
            feedback.hidden = false;
            feedback.classList.add(correct ? "good" : "bad");
            next.hidden = false;
            next.focus();
          });
          opts.appendChild(b);
          return b;
        });
        box.appendChild(opts);
        feedback.hidden = true;
        box.appendChild(feedback);
        box.appendChild(next);
      }

      function finish() {
        store = H.recordAttempt(store, slug, title, results.map(r => ({ q: r.q, correct: r.correct })), Date.now(), { partial });
        saveFailed = !saveStore(store);
        const score = results.filter(r => r.correct).length;
        const pct = H.percent(score, results.length);
        box.replaceChildren();

        const card = el("div", "quiz-score " + H.levelOf(pct));
        card.appendChild(el("p", "quiz-big", score + " / " + results.length));
        card.appendChild(el("p", "", pct + "% · " + (pct >= 80 ? "Strong. You can explain this." : pct >= 60 ? "Getting there. Read the missed ones below." : "Not yet. Open the cards for the missed ones, then try again.")));
        box.appendChild(card);
        if (partial) box.appendChild(el("p", "quiz-note", "This was a retry, so it does not change your lesson score."));
        if (saveFailed) box.appendChild(el("p", "quiz-note warn", "This browser would not save your score (private window?). It is shown here only."));

        const missed = results.filter(r => !r.correct);
        if (missed.length) {
          box.appendChild(el("h3", "", "What you missed"));
          missed.forEach(r => {
            const row = el("div", "quiz-miss");
            row.appendChild(fill(el("p", "quiz-q"), r.item.q));
            row.appendChild(fill(el("p", "quiz-answer", ""), "Answer: " + r.item.options[r.item.answer]));
            row.appendChild(fill(el("p", "quiz-explain"), r.item.why));
            box.appendChild(row);
          });
        }

        const actions = el("div", "quiz-actions");
        if (missed.length) {
          const retry = el("button", "quiz-btn primary", "Retry the " + missed.length + " I missed");
          retry.type = "button";
          retry.addEventListener("click", () => run(missed.map(r => r.item), true));
          actions.appendChild(retry);
        }
        const again = el("button", "quiz-btn", "Take the whole quiz again");
        again.type = "button";
        again.addEventListener("click", () => run(questions, false));
        actions.appendChild(again);
        const all = el("a", "quiz-btn", "All my scores");
        all.href = "progress.html";
        actions.appendChild(all);
        box.appendChild(actions);
      }

      ask();
    }

    showStart();
  }

  window.Quiz = { mount };
})();
