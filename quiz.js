// The quiz card inside a lesson (viewer.html). Needs quiz-helpers.js first.
// Quiz.mount(box, { slug, title, questions }) draws one question at a time, marks each answer at once, and saves the score in this browser.
// Question types (see quiz-helpers.js): single, multi, tf, order, fill. Each one has a small drawing function in RENDER below.
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

  // ---- One drawing function per question type ----
  // Each gets the empty area `zone`, the question `item`, and `done(correct)`, which it calls once when the learner has answered.
  // Everything shared (progress bar, question text, the "why" box, the Next button) is drawn by mount().

  const HINT = {
    single: "Pick one answer.",
    multi: "Pick all that are true. There can be more than one.",
    tf: "True or false?",
    order: "Tap the items in the right order, first to last.",
    fill: "Type your answer.",
  };

  function button(label, cls, onClick) {
    const b = el("button", cls, label);
    b.type = "button";
    b.addEventListener("click", onClick);
    return b;
  }

  // The list of answer buttons. choices: [{ label, right }]. One tap answers the question.
  function pickOne(zone, choices, done) {
    const grid = el("div", "quiz-options");
    const buttons = choices.map(c => {
      const b = el("button", "quiz-opt");
      b.type = "button";
      fill(b, c.label);
      b.addEventListener("click", () => {
        buttons.forEach((other, k) => {
          other.disabled = true;
          if (choices[k].right) other.classList.add("right");
        });
        if (!c.right) b.classList.add("wrong");
        done(!!c.right);
      });
      grid.appendChild(b);
      return b;
    });
    zone.appendChild(grid);
  }

  const RENDER = {
    single(zone, item, done) {
      const choices = H.shuffledOrder(item.options.length).map(k => ({ label: item.options[k], right: k === item.answer }));
      pickOne(zone, choices, done);
    },

    tf(zone, item, done) {
      pickOne(zone, [{ label: "True", right: item.answer === true }, { label: "False", right: item.answer === false }], done);
      zone.firstChild.classList.add("quiz-row");
    },

    // Tap to switch an option on or off, then press Check. All or nothing: a missed option or an extra one is wrong.
    multi(zone, item, done) {
      const order = H.shuffledOrder(item.options.length);
      const picked = new Set();
      const grid = el("div", "quiz-options");
      const check = button("Check my answer", "quiz-btn primary", () => {
        const correct = H.checkAnswer(item, [...picked]);
        buttons.forEach((b, k) => {
          const orig = order[k];
          b.disabled = true;
          if (item.answer.includes(orig)) b.classList.add(picked.has(orig) ? "right" : "missed");
          else if (picked.has(orig)) b.classList.add("wrong");
        });
        check.hidden = true;
        done(correct);
      });
      check.disabled = true;
      const buttons = order.map(orig => {
        const b = el("button", "quiz-opt multi");
        b.type = "button";
        b.setAttribute("aria-pressed", "false");
        fill(b, item.options[orig]);
        b.addEventListener("click", () => {
          if (picked.has(orig)) picked.delete(orig); else picked.add(orig);
          b.classList.toggle("picked", picked.has(orig));
          b.setAttribute("aria-pressed", String(picked.has(orig)));
          check.disabled = picked.size === 0;
        });
        grid.appendChild(b);
        return b;
      });
      zone.append(grid, check);
    },

    // Tap the items one by one to build the order. Tap a placed item to take it out again.
    order(zone, item, done) {
      const shown = H.shuffledOrder(item.items.length, Math.random, { notSorted: true });
      let picked = []; // item numbers, in the order the learner tapped them
      let locked = false;
      const mine = el("ol", "quiz-order");
      const pool = el("div", "quiz-options");
      const check = button("Check my order", "quiz-btn primary", () => {
        locked = true;
        draw();
        done(H.checkAnswer(item, picked));
      });
      const reset = button("Start over", "quiz-btn", () => { picked = []; draw(); });
      const poolLabel = el("p", "quiz-label", "Items");

      function draw() {
        mine.replaceChildren();
        pool.replaceChildren();
        if (!picked.length) mine.appendChild(el("li", "quiz-empty", "Nothing yet. Tap an item below."));
        picked.forEach((k, pos) => {
          const li = el("li", "quiz-step" + (locked ? (k === pos ? " right" : " wrong") : ""));
          if (locked) fill(li, item.items[k]);
          else {
            const b = el("button", "quiz-opt");
            b.type = "button";
            b.title = "Tap to take it out";
            fill(b, item.items[k]);
            b.addEventListener("click", () => { picked.splice(pos, 1); draw(); });
            li.appendChild(b);
          }
          mine.appendChild(li);
        });
        if (locked) { pool.hidden = poolLabel.hidden = check.hidden = reset.hidden = true; return; }
        shown.filter(k => !picked.includes(k)).forEach(k => {
          const b = el("button", "quiz-opt");
          b.type = "button";
          fill(b, item.items[k]);
          b.addEventListener("click", () => { picked.push(k); draw(); });
          pool.appendChild(b);
        });
        pool.hidden = poolLabel.hidden = pool.childElementCount === 0;
        check.disabled = picked.length !== item.items.length;
        reset.disabled = picked.length === 0;
      }

      zone.append(el("p", "quiz-label", "Your order"), mine, poolLabel, pool, check, reset);
      draw();
    },

    // Type the answer. Extra spaces and line breaks do not matter. A long answer (with line breaks) gets a bigger box.
    fill(zone, item, done) {
      const multiline = /\n/.test(H.correctText(item));
      const input = el(multiline ? "textarea" : "input", "quiz-input");
      if (multiline) input.rows = 4; else input.type = "text";
      input.setAttribute("aria-label", "Your answer");
      input.setAttribute("autocomplete", "off");
      input.setAttribute("autocapitalize", "off");
      input.spellcheck = false;
      const check = button("Check my answer", "quiz-btn primary", () => {
        const correct = H.checkAnswer(item, input.value);
        input.disabled = true;
        input.classList.add(correct ? "right" : "wrong");
        check.hidden = true;
        done(correct);
      });
      check.disabled = true;
      input.addEventListener("input", () => { check.disabled = !input.value.trim(); });
      // preventDefault: the same key press must not also click the Next button, which gets the focus when the answer is checked.
      input.addEventListener("keydown", e => { if (e.key === "Enter" && !multiline) { e.preventDefault(); if (!check.disabled) check.click(); } });
      zone.append(input, check);
      input.focus({ preventScroll: true });
    },
  };

  function mount(box, { slug, title, questions }) {
    let store = loadStore();
    let saveFailed = false;

    function lastLine() {
      const sum = H.summarizeLesson(store.lessons[slug]);
      const p = el("p", "quiz-last");
      if (!sum) {
        p.textContent = "You have not tried this quiz yet. " + questions.length + " questions, about " + Math.max(2, Math.round(questions.length / 2)) + " minutes. ";
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
        const type = H.questionType(item);
        box.replaceChildren();
        const bar = el("div", "quiz-bar");
        const fillBar = el("i");
        fillBar.style.width = Math.round((i / list.length) * 100) + "%";
        bar.appendChild(fillBar);
        box.appendChild(bar);
        box.appendChild(el("p", "quiz-count", (partial ? "Retry · " : "") + "Question " + (i + 1) + " of " + list.length));
        box.appendChild(fill(el("p", "quiz-q"), item.q));
        if (item.code) box.appendChild(el("pre", "quiz-code", item.code));

        box.appendChild(el("p", "quiz-hint", HINT[type]));
        const zone = el("div", "quiz-zone");
        zone.setAttribute("role", "group");
        zone.setAttribute("aria-label", HINT[type]);
        const feedback = el("div", "quiz-why");
        feedback.setAttribute("aria-live", "polite");
        feedback.hidden = true;
        const next = el("button", "quiz-btn primary", i === list.length - 1 ? "See my score" : "Next question");
        next.type = "button";
        next.hidden = true;
        next.addEventListener("click", () => { i++; if (i < list.length) ask(); else finish(); });
        box.append(zone, feedback, next);

        // Called once by the drawing function of the question type, when the learner has answered.
        RENDER[type](zone, item, (correct) => {
          results.push({ q: item.q, correct, item });
          feedback.replaceChildren(el("b", "", correct ? "✅ Right. " : "❌ Not quite. "));
          // For these two the page cannot highlight the right answer, so say it.
          if (!correct && (type === "order" || type === "fill")) feedback.appendChild(fill(el("span", "quiz-answer"), "Answer: " + H.correctText(item) + ". "));
          feedback.appendChild(fill(el("span"), item.why));
          feedback.hidden = false;
          feedback.classList.add(correct ? "good" : "bad");
          next.hidden = false;
          next.focus();
        });
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
            row.appendChild(fill(el("p", "quiz-answer", ""), "Answer: " + H.correctText(r.item)));
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
