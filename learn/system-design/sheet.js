/* Shared renderer for the system design cheatsheets (copied from learn/database/sheet.js).
   Each page sets window.SHEET = {key, concepts, decisions, cases, hooks, cards} and includes the matching containers. */
(function(){
  var S = window.SHEET || {};
  function $(id){ return document.getElementById(id) }
  function load(k, d){ try{ return JSON.parse(localStorage.getItem(k) || d) }catch(e){ return JSON.parse(d) } }
  function store(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)) }catch(e){} }

  /* concepts with a "I can explain this" tick */
  var KEY = (S.key || "db-sheet") + "-known";
  var known = new Set(load(KEY, "[]"));
  var grid = $("conceptGrid");
  function updateProgress(){
    if(!S.concepts || !$("progressFill")) return;
    var pct = Math.round(known.size / S.concepts.length * 100);
    $("progressFill").style.width = pct + "%";
    $("progressLabel").textContent = known.size + " / " + S.concepts.length + " concepts I can explain";
  }
  if(grid && S.concepts){
    S.concepts.forEach(function(c, i){
      var el = document.createElement("div");
      el.className = "concept" + (known.has(i) ? " known" : "");
      el.innerHTML = '<span class="num-chip">' + (i + 1) + '</span><button class="got" type="button" aria-label="I can explain this">✓</button><h3>' + c.t + '</h3><p>' + c.d + '</p>';
      el.querySelector(".got").addEventListener("click", function(){
        known.has(i) ? known.delete(i) : known.add(i);
        store(KEY, Array.from(known));
        el.classList.toggle("known", known.has(i));
        updateProgress();
      });
      grid.appendChild(el);
    });
  }
  window.resetProgress = function(){
    known.clear(); store(KEY, []);
    document.querySelectorAll(".concept").forEach(function(el){ el.classList.remove("known") });
    updateProgress();
  };
  updateProgress();

  /* decisions: A versus B with a verdict */
  var dl = $("decisionList");
  if(dl && S.decisions) S.decisions.forEach(function(d){
    var el = document.createElement("div"); el.className = "decision";
    el.innerHTML = '<div class="vs"><span class="badge">VS</span> ' + d.q + '</div><div class="cols"><div class="col a"><b>' + d.a + '</b>' + d.at + '</div><div class="col b"><b>' + d.b + '</b>' + d.bt + '</div></div><div class="verdict"><b>Verdict:</b> ' + d.v + '</div>';
    dl.appendChild(el);
  });

  var cl = $("caseList");
  if(cl && S.cases) S.cases.forEach(function(c){
    var el = document.createElement("div"); el.className = "case";
    el.innerHTML = '<span class="topic">' + c.topic + '</span><b>' + c.b + '</b><p>' + c.p + '</p>';
    cl.appendChild(el);
  });
  var hl = $("hookList");
  if(hl && S.hooks) S.hooks.forEach(function(h){
    var el = document.createElement("div"); el.className = "hook";
    el.innerHTML = '<b>' + h.b + '</b><p>' + h.p + '</p>';
    hl.appendChild(el);
  });

  /* flashcards: question first, answer in four parts, then "got it" or "not yet" */
  var fc = $("flash");
  if(fc && S.cards){
    var FK = (S.key || "db-sheet") + "-cards";
    var marks = load(FK, "{}");
    var cats = [];
    S.cards.forEach(function(c){ if(cats.indexOf(c.cat) < 0) cats.push(c.cat) });
    var sel = $("fcCat"), modeSel = $("fcMode");
    cats.forEach(function(c){ var o = document.createElement("option"); o.value = c; o.textContent = c; sel.appendChild(o) });
    var deck = [], pos = 0;
    function build(){
      var cat = sel.value, mode = modeSel.value;
      deck = S.cards.map(function(c, i){ return i }).filter(function(i){
        var c = S.cards[i];
        if(cat !== "all" && c.cat !== cat) return false;
        if(mode === "notyet" && marks[i] === "ok") return false;
        return true;
      });
      if($("fcShuffle").getAttribute("aria-pressed") === "true"){
        for(var k = deck.length - 1; k > 0; k--){ var j = Math.floor(Math.random() * (k + 1)); var t = deck[k]; deck[k] = deck[j]; deck[j] = t }
      }
      pos = 0; show();
    }
    function stats(){
      var ok = 0, no = 0; Object.keys(marks).forEach(function(k){ if(marks[k] === "ok") ok++; else if(marks[k] === "no") no++ });
      $("fcStats").textContent = ok + " got it · " + no + " not yet · " + (S.cards.length - ok - no) + " not tried, out of " + S.cards.length;
    }
    function show(){
      stats();
      if(!deck.length){ fc.className = "fc"; fc.innerHTML = '<h3>Nothing left in this pile.</h3><p class="try">Switch the pile to "All cards" or pick another topic.</p>'; return }
      var i = deck[pos], c = S.cards[i];
      var parts = [["Problem", c.p], ["How it works", c.h], ["Tradeoff", c.t], ["My example", c.m]].filter(function(x){ return x[1] });
      fc.className = "fc";
      fc.innerHTML = '<span class="cat">' + c.cat + '</span><span class="lvl">' + (c.lvl || "Senior") + '</span>' +
        (marks[i] ? '<span class="lvl">' + (marks[i] === "ok" ? "got it before" : "not yet before") + '</span>' : '') +
        '<h3>' + (pos + 1) + ' / ' + deck.length + ' · ' + c.q + '</h3>' +
        '<p class="try">Say your answer out loud first: problem, how it works, tradeoff, your example. Then open it.</p>' +
        '<div class="ans">' + parts.map(function(x){ return '<div class="part"><b>' + x[0] + '</b><span>' + x[1] + '</span></div>' }).join("") +
        (c.f ? '<div class="follow"><b>Follow-up they will ask:</b> ' + c.f + '</div>' : '') +
        (c.r ? '<div class="red"><b>Weak answer to avoid:</b> ' + c.r + '</div>' : '') + '</div>' +
        '<div class="fc-actions"><button type="button" data-fc="open">Show answer</button><button type="button" class="ok" data-fc="ok">Got it</button><button type="button" class="no" data-fc="no">Not yet</button><button type="button" class="ghost" data-fc="prev">Back</button><button type="button" class="ghost" data-fc="next">Skip</button></div>';
    }
    fc.addEventListener("click", function(e){
      var b = e.target.closest("[data-fc]"); if(!b) return;
      var a = b.getAttribute("data-fc"), i = deck[pos];
      if(a === "open"){ fc.classList.toggle("open"); b.textContent = fc.classList.contains("open") ? "Hide answer" : "Show answer"; return }
      if(a === "ok" || a === "no"){ marks[i] = a; store(FK, marks) }
      if(a === "prev"){ pos = Math.max(0, pos - 1) } else { pos = pos + 1; if(pos >= deck.length) pos = 0 }
      show();
    });
    sel.addEventListener("change", build); modeSel.addEventListener("change", build);
    $("fcShuffle").addEventListener("click", function(){ var on = this.getAttribute("aria-pressed") !== "true"; this.setAttribute("aria-pressed", on); this.textContent = on ? "Shuffled" : "In order"; build() });
    $("fcReset").addEventListener("click", function(){ marks = {}; store(FK, marks); build() });
    build();
  }

  /* tabs */
  document.querySelectorAll("nav button").forEach(function(btn){
    btn.addEventListener("click", function(){
      document.querySelectorAll("nav button").forEach(function(b){ b.classList.remove("active"); b.setAttribute("aria-selected", "false") });
      document.querySelectorAll("section").forEach(function(s){ s.classList.remove("active") });
      btn.classList.add("active"); btn.setAttribute("aria-selected", "true");
      $(btn.dataset.tab).classList.add("active");
      window.scrollTo(0, 0);
    });
  });
})();
