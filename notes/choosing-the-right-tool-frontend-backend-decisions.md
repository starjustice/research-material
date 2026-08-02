# Choosing the Right Tool — Frontend, Mobile, Backend, and Architecture Decisions

- **Researched:** 2026-07-29
- **Target:** Software Engineer / Senior Software Engineer interviews — asked live at Bank Mandiri ("kenapa pilih React, kapan pakai Angular?")
- **Sources freshness:** 2025–2026 market and framework data

## TL;DR

- **The question is never "which is better."** It's testing whether you can reason from constraints. A ranking is the wrong answer; a decision framework applied to a problem is the right one.
- **The answer shape:** clarify the problem → name 2–3 real options → compare on constraints that matter here → pick one → **state what you're giving up**.
- **The fastest way to fail:** "React is the best framework." The second fastest: criticizing the stack the interviewer's company actually uses.
- **In 2026 the honest truth about frontend frameworks:** at real-world scale the choice between React, Angular, and Vue matters far less than architecture, caching, and rendering strategy. Say that — it's a senior observation.
- **Bank Mandiri uses Angular *and* React, Java backend, native Kotlin/Swift mobile.** Have a respectful, well-reasoned view of why an enterprise picks each.

---

## 1. The answer framework — the most important section

Every "why did you choose X" question gets the same five-step shape. Practice this until it's automatic.

```mermaid
graph LR
  A[1 Clarify the problem and constraints] --> B[2 Name 2-3 real options]
  B --> C[3 Compare on what matters here]
  C --> D[4 Choose one]
  D --> E[5 Say what you gave up]
```

**The five steps, in words:**

1. **Clarify first.** "Aplikasi seperti apa? Berapa besar timnya? Berapa lama umur sistemnya?" A tradeoff cannot be resolved in the abstract — the right answer depends entirely on the requirements.
2. **Name real alternatives.** Showing you considered options is half the point.
3. **Compare on constraints that actually apply:** team skill, project lifespan, hiring, performance targets, operational burden, cost, ecosystem maturity.
4. **Make a decision.** Refusing to choose reads as indecision, not nuance.
5. **State the cost.** This is what separates senior from mid. *A decision explained without its cost sounds shallow.*

**The constraints that decide most real choices** — and notice how few of them are technical:

| Constraint | Why it usually wins |
|---|---|
| **What the team already knows** | The best framework your team can't maintain is the worst choice |
| **Hiring pool** | Can you replace someone in 3 months? |
| **Project lifespan** | A 10-year banking system has different needs than a 6-month campaign site |
| **Ecosystem maturity** | Libraries, docs, and answers when you're stuck at 2 AM |
| **Operational burden** | Who runs it at 3 AM, and how hard is it to debug? |
| **Regulatory/security needs** | In banking this can eliminate options outright |

> **Say this and you'll sound senior:** *"Keputusan teknologi itu jarang murni teknis. Yang paling sering menentukan: tim sudah menguasai apa, sistemnya akan hidup berapa lama, dan siapa yang akan merawatnya. Framework terbaik yang tidak bisa dirawat tim itu pilihan terburuk."*

---

## 2. Frontend — React vs Angular vs Vue vs Svelte

### The market in 2026

| Framework | Share | Where it concentrates |
|---|---|---|
| **React** | ~40–45%, 30M+ weekly npm downloads | Everywhere — the default |
| **Vue** | ~15–20% | Strong in Asia-Pacific |
| **Angular** | ~12–15% | **Enterprise**, especially with existing TypeScript investment |
| **Svelte** | ~10–12% awareness | Growing, but ecosystem-limited for enterprise |

### When each one is the right answer

**React — choose when:**
- You need the **largest hiring pool** and the deepest ecosystem. This is the single most common real reason.
- The team already knows it.
- You want flexibility in choosing your own router, state management, and data layer.
- **The cost:** that flexibility means every team makes different choices. Two React codebases in the same company can look nothing alike. You must impose your own conventions.

**Angular — choose when:**
- **Large, long-lived enterprise applications where many contributors rotate through the codebase.** This is exactly a bank.
- Consistency matters more than day-one speed. Angular is opinionated: routing, HTTP, forms, and DI all ship in the box, so there's one obvious way to do things.
- The team is already deep in TypeScript — Angular is TypeScript-first by design.
- **The cost:** a steeper learning curve, more ceremony, and a larger core bundle (~60–80KB, though ahead-of-time compilation removes much of the framework in production builds).

> **This is the Bank Mandiri-relevant answer.** If asked why a bank would use Angular:
> *"Untuk sistem enterprise yang umurnya panjang dan banyak developer keluar-masuk, Angular masuk akal — karena opinionated. Routing, HTTP, form, dependency injection sudah ada standarnya, jadi kode dari tim yang berbeda tetap seragam. Di React, fleksibilitasnya bagus untuk tim kecil yang bergerak cepat, tapi di organisasi besar bisa jadi tiap tim punya cara sendiri. Jadi menurut saya pilihannya bukan mana yang lebih baik, tapi mana yang cocok dengan umur sistem dan ukuran timnya."*

**Vue — choose when:**
- A small or mid-size team wants an approachable, curated framework without heavy ceremony.
- You want fast development velocity and readable code.
- **The cost:** smaller enterprise hiring pool outside Asia-Pacific.

**Svelte — choose when:**
- Runtime performance and small bundles genuinely matter — widgets, embedded UI, performance-critical pages.
- **The cost:** reference architectures, hiring pools, and enterprise tooling remain significantly smaller than the big three. **Not yet the safe enterprise default in 2026** — worth watching for 2027–2028.

### ⭐ The senior observation most candidates miss

> "Satu hal yang saya perhatikan: di aplikasi nyata, perbedaan performa antara React, Vue, dan Angular biasanya tidak terasa oleh user. Yang jauh lebih berpengaruh itu keputusan arsitektur — code splitting, caching, strategi rendering, ukuran gambar, dan desain aplikasinya secara keseluruhan. Jadi saya tidak memilih framework berdasarkan benchmark, tapi berdasarkan tim dan umur sistemnya."

This is well supported: even when one framework benchmarks faster, the user-perceived difference in real applications is usually negligible compared to architecture and network decisions.

---

## 3. Mobile — React Native vs Flutter vs Native

| Option | Choose when | Cost |
|---|---|---|
| **React Native** | Team already knows React/JS; you want one codebase; standard business app | Bridging to native modules for anything unusual; some platform-specific work remains |
| **Flutter** | You need pixel-identical UI across platforms; heavy custom UI, charts, animations | Dart is a separate ecosystem; larger binaries |
| **Native (Kotlin/Swift)** | Deep OS integration, maximum security/performance, bleeding-edge platform features | **70–90% more upfront cost, ~100% more maintenance** — two codebases, two teams |

**2026 context:** React Native holds ~35–38% of the cross-platform market, and its Fabric architecture now delivers performance indistinguishable from native for standard business apps. Cross-platform wins for the large majority of apps shipped; native wins the remainder — typically bleeding-edge OS features, AR/VR, or maximum performance.

### Why a bank chooses native — the Bank Mandiri answer

Bank Mandiri uses **Kotlin and Swift**, not React Native. Have a respectful reason ready:

> "Untuk aplikasi perbankan, native masuk akal meski biayanya jauh lebih mahal. Alasannya bukan performa saja: integrasi keamanan yang dalam — biometrik, secure enclave, hardware-backed keystore, anti-tampering — itu paling andal di native. Dan fitur OS baru biasanya tersedia lebih dulu di native. Untuk aplikasi yang dipakai puluhan juta orang dan menyentuh uang, biaya dua codebase itu terbayar oleh kontrol keamanannya.
>
> Pengalaman React Native saya tetap relevan, karena masalah delivery mobile-nya sama: ukuran aplikasi, performa di HP kelas bawah, jaringan tidak stabil, dan siklus rilis App Store yang tidak bisa kita kontrol."

That last paragraph matters — it turns your React Native background into transferable insight instead of a mismatch.

---

## 4. Backend languages — Java vs Node vs Go vs Python

| Language | Owns | Choose when | Cost |
|---|---|---|---|
| **Java** | Large enterprise systems | Long-lived, regulated systems; big teams; strong typing and mature frameworks; predictable performance | Verbose; heavier runtime; slower to prototype |
| **Node.js** | Real-time and I/O-heavy APIs | Many concurrent connections; one language across the stack; fast iteration | CPU-heavy work blocks the event loop; less suited to heavy computation |
| **Go** | Cloud-native, high-concurrency services | Performance and concurrency matter; small, fast-starting binaries. Fastest-growing in cloud-native and fintech | Smaller ecosystem; deliberately minimal language |
| **Python** | Data, AI/ML | Data science, ML, automation; fastest to write readable backends | Slower runtime; GIL limits CPU parallelism |

### Why a bank runs Java — answer this respectfully

> "Java masuk akal untuk perbankan karena tiga hal: strong static typing yang menangkap error saat compile — penting untuk sistem yang menyentuh uang; ekosistem enterprise yang matang untuk transaksi, keamanan, dan integrasi; dan yang paling penting, umur panjang. Sistem bank itu hidup 10–20 tahun. Java punya rekam jejak kompatibilitas mundur dan ketersediaan engineer dalam rentang waktu segitu, yang belum tentu dimiliki ekosistem yang lebih baru."

### How to talk about your own Node choice

Don't be defensive — give the actual reason:

> "Di DBO saya pakai Node dan TypeScript karena beban kerjanya I/O-heavy — banyak menunggu database dan API pihak ketiga, bukan komputasi berat. Node kuat di situ. Ditambah satu bahasa untuk frontend dan backend, jadi tim kecil bisa bergerak cepat dan berbagi tipe data antar layer.
>
> Kalau sistemnya butuh komputasi berat atau timnya jauh lebih besar dengan banyak rotasi, saya akan pertimbangkan ulang — di situ typing yang lebih ketat dan struktur yang lebih kaku seperti Java justru menguntungkan."

**That last sentence is the senior move:** naming the condition under which your own past decision would flip.

---

## 5. Database — SQL vs NoSQL

**The 2026 consensus is clear:** pick **PostgreSQL by default**; reach for NoSQL when the access pattern, scale, or latency target genuinely requires it. (SQL sits at ~48% usage vs NoSQL ~25%.)

**Choose PostgreSQL when:**
- Data has real relational structure — entities referencing each other
- **Correctness and integrity are non-negotiable** — financial systems, healthcare
- You need complex queries, joins, and reporting flexibility
- You want the broadest ecosystem of ORMs, tools, and managed services

**Choose NoSQL when:**
- The schema is genuinely fluid
- Writes are explosive and horizontal scale-out is a hard requirement
- Simple key lookups at massive scale (Redis returns in under 1ms; DynamoDB guarantees single-digit-ms at any scale)

> **The banking line:** *"Untuk sistem yang menyentuh uang, saya default ke relational — karena transaksi ACID dan constraint di level database itu jaminan yang tidak bergantung pada kode aplikasi yang benar. Unique constraint menyelamatkan saya dari bug idempotency di sistem sebelumnya."*

**Worth adding:** PostgreSQL in 2026 is no longer "just relational" — it handles JSON documents, vectors, time-series, and geospatial data. Often you don't need a second database at all. **Reaching for a new database is a big operational commitment; the bar should be high.**

---

## 6. REST vs GraphQL

| | Choose when | Cost |
|---|---|---|
| **REST** | Simple, stable, internal APIs; heavy caching needs; public APIs where predictability matters | Over-fetching or under-fetching; endpoint proliferation as clients diverge |
| **GraphQL** | **Many clients with different data needs** — mobile wants 3 fields, web wants 20; rapidly evolving frontends | HTTP caching is harder; N+1 is easy to create; more setup |

> "GraphQL saya pilih waktu ada beberapa client dengan kebutuhan data berbeda — mobile butuh sedikit field, web butuh banyak — tanpa harus bikin endpoint baru setiap kali. Biayanya: caching lebih rumit karena semuanya lewat satu endpoint POST, dan N+1 gampang muncul kalau tidak pakai batching seperti DataLoader. Untuk API internal yang stabil dan sederhana, REST sering lebih mudah dioperasikan dan di-cache."

---

## 7. Monolith vs Microservices

**The 2026 shift is real and worth knowing:** companies that rushed into microservices are **consolidating back**, and the **modular monolith** has become the recommended starting point.

**The numbers:** running 15 microservices costs **5–10× more** than one modular monolith at equivalent traffic. Common thresholds cited before microservices make sense: **>1M requests/day or 50+ developers**.

| Choose | When |
|---|---|
| **Modular monolith** | New projects, teams under ~15–20 developers. Simpler to run, faster to build, and **you learn where the boundaries actually are before committing to them** |
| **Microservices** | Independent scaling needs, team autonomy at scale, different deploy cadences, failure isolation that genuinely matters |

> **The strongest thing you can say — and it's honest:**
> *"Di DBO saya pisahkan service berdasarkan kebutuhan operasional, bukan karena ingin microservices. Service integrasi pihak ketiga saya pisah karena kegagalannya tidak boleh menjatuhkan API utama, dan pola bebannya beda — banyak menunggu jaringan.
>
> Tapi kalau jujur, sebagian pemisahan itu belum perlu di awal. Untuk skala kami saat itu, monolith yang tertata rapi lebih mudah dioperasikan, dan pemisahan bisa dilakukan belakangan setelah bebannya jelas. Memisahkan terlalu awal itu menambah biaya operasional tanpa manfaat yang sepadan."*

**Admitting the over-split is a senior signal, not a weakness.** It shows judgment rather than fashion-following.

---

## 8. Sync vs async (message queue)

- **Synchronous** when the user is waiting for the answer right now — check balance, login, confirm a transaction.
- **Queue** when the work can complete slightly later (notifications, reports, syncing to another system), or when you need the system to survive the target service being down.
- **The cost:** queues add duplicate messages, ordering concerns, monitoring, and dead-letter handling. *"Jadi saya tidak pakai queue kalau tidak ada alasan yang jelas — panggilan langsung yang sederhana lebih mudah di-debug."*

---

## 9. How to talk about *your* past decisions

They will likely ask "why did you choose X in your project?" Use this shape:

1. **The constraint** — what forced the decision
2. **The alternatives** you considered
3. **Why this one won** *for that context*
4. **What it cost you**
5. **What would make you decide differently**

**Worked example — GraphQL at DBO:**

> "Constraint-nya: ada tiga frontend — aplikasi mobile untuk toko, CMS, dan panel verifikasi — dengan kebutuhan data yang berbeda-beda, dan semuanya berkembang cepat.
>
> Alternatifnya REST. Tapi dengan REST kami akan terus menambah endpoint atau parameter tiap kali satu client butuh bentuk data berbeda.
>
> GraphQL menang karena tiap client bisa minta persis yang dia butuhkan dari satu schema. Untuk mobile itu penting — payload lebih kecil di jaringan yang tidak stabil.
>
> Biayanya nyata: caching lebih sulit, dan kami sempat kena N+1 sampai pakai DataLoader untuk batching.
>
> Kalau clientnya cuma satu dan kebutuhannya stabil, saya akan pilih REST — lebih sederhana dan lebih mudah di-cache."

That's a complete senior answer in under a minute.

---

## 10. Red flags — what loses points

| Don't | Why | Instead |
|---|---|---|
| "React is the best framework" | Treating one side as universally better ignores the entire point of a tradeoff | "React cocok kalau…, Angular cocok kalau…" |
| Criticize the interviewer's stack | You're interviewing at a company that chose Angular and Java | Explain *why their choice makes sense* for their context |
| List only benefits | A decision without its cost sounds shallow | Always end with what you gave up |
| Refuse to choose | Reads as indecision | Pick one, then name the condition that would flip it |
| Answer without asking about constraints | A tradeoff can't be resolved in the abstract | "Boleh saya tahu dulu — timnya berapa orang, sistemnya untuk berapa lama?" |
| Choose by benchmark | Real-world differences are usually dominated by architecture | Choose by team, lifespan, and operational burden |

---

## 11. Cheatsheet

**The answer shape, every time:**
Clarify → 2–3 options → compare on real constraints → choose → **say what you gave up**.

**The constraints that actually decide:**
Team skill · hiring pool · project lifespan · ecosystem maturity · operational burden · regulation.

**One-line positions:**

| Decision | Default | Switch when |
|---|---|---|
| React vs Angular | React for flexibility and hiring | Angular for long-lived enterprise apps with rotating contributors |
| Cross-platform vs native | Cross-platform for most apps | Native for deep security/OS integration — costs ~2× |
| Node vs Java | Node for I/O-heavy, fast-moving | Java for long-lived, regulated, large-team systems |
| SQL vs NoSQL | **PostgreSQL by default** | NoSQL when access pattern/scale/latency genuinely demands it |
| REST vs GraphQL | REST for stable, simple, cacheable | GraphQL for many clients with different data needs |
| Monolith vs microservices | **Modular monolith to start** | Microservices past ~1M req/day or 50+ devs |
| Sync vs queue | Sync when the user waits | Queue for deferrable work or failure isolation |

**Numbers worth quoting (one, not all):**
- 15 microservices ≈ **5–10× the cost** of one modular monolith at equal traffic
- Native mobile ≈ **70–90% more upfront**, ~100% more maintenance
- React ~40–45% share; Angular ~12–15%, concentrated in enterprise

**The two lines that make you sound senior:**
1. *"Keputusan teknologi jarang murni teknis — yang menentukan biasanya tim, umur sistem, dan siapa yang merawatnya."*
2. *"Sebagian pemisahan service di proyek saya sebenarnya belum perlu di awal."* (admitting a real tradeoff you got wrong)

---

## Sources

**Frontend**
- [React vs Angular vs Vue in 2026: Which Framework for Enterprise? — mpiric Software](https://mpiricsoftware.com/react-vs-angular-vs-vue-in-2026-which-framework-for-enterprise/) — enterprise fit and TypeScript alignment
- [Frontend Framework Comparison 2026 — Pharos Production](https://pharosproduction.com/insights/engineering/frontend-framework-comparison-2026/) — market share, when each fits
- [15 JavaScript Frameworks Compared (2026): Performance, Jobs & Hidden Costs — Ortem Tech](https://ortemtech.com/blog/javascript-frameworks-comparison-2026/) — hiring pools and hidden costs
- [React vs. Angular vs. Vue: A Practical Comparison for 2026 — Ascendient Learning](https://www.ascendientlearning.com/blog/comparing-angular-react-vue-svelte) — bundle sizes, AOT, ecosystem maturity

**Mobile**
- [Flutter vs React Native vs Native (Swift/Kotlin): Which Stack in 2026? — Instabizweb](https://www.instabizweb.com/blogs/flutter-vs-react-native-vs-native-swift-kotlin) — cost multipliers, when native wins
- [Native vs Cross-Platform Mobile App Development 2026 — Innovaria Tech](https://innovariatech.com/blog/native-vs-cross-platform-mobile-app-development-2026) — decision criteria
- [Kotlin vs Swift vs Flutter vs React Native 2026 — MetaCTO](https://www.metacto.com/blogs/kotlin-competitors-and-alternatives-in-2024-comprehensive-comparison) — banking and security considerations

**Backend**
- [Node vs Python vs Java in 2026: Which Backend to Choose — Unico Connect](https://unicoconnect.com/blogs/node-vs-python-vs-java) — what each language "owns"
- [Top 11 Backend Programming Languages in 2026 — Webandcrafts](https://webandcrafts.com/blog/backend-languages) — Go in cloud-native and fintech
- [Node.js vs Python vs Java: Which Backend to Learn in 2026 — NareshIT](https://nareshit.com/blogs/nodejs-vs-python-vs-java-which-backend-to-learn-2026) — enterprise stability

**Data & architecture**
- [PostgreSQL vs MongoDB in 2026: When to Choose SQL Over NoSQL — DEV](https://dev.to/philip_mcclarence_2ef9475/postgresql-vs-mongodb-in-2026-when-to-choose-sql-over-nosql-1no1) — "PostgreSQL by default" consensus
- [SQL vs NoSQL 2026: 48% vs 25% Use — Tech Insider](https://tech-insider.org/sql-vs-nosql-2026/) — usage figures
- [Monolith vs Microservices in 2026: The Decision Framework — DistantJob](https://distantjob.com/blog/monolith-vs-microservices/) — thresholds and cost multipliers
- [Microservices vs Modular Monolith: Architecture Choice 2026 — Horizon Labs](https://www.horizonlabs.com.au/insights/microservices-vs-modular-monolith-choosing-right-architecture-2026) — the consolidation trend
- [Microservices vs Monoliths in 2026: When Each Architecture Wins — Java Code Geeks](https://www.javacodegeeks.com/2025/12/microservices-vs-monoliths-in-2026-when-each-architecture-wins.html) — boundaries and team size

**Interview technique**
- [What are the tradeoffs in a System Design interview? — Engineering Enablement](https://engineeringenablement.substack.com/p/what-are-the-tradeoffs-in-a-system) — why interviewers ask, what strong answers look like
- [How to Use Trade-Off Analysis in System Design Interviews — AlgoCademy](https://algocademy.com/blog/how-to-use-trade-off-analysis-in-system-design-interviews/) — common mistakes
- [Architecture Decision Records: A Practical Guide for 2026 — John Pratt](https://www.john-pratt.com/architecture-decision-record) — the decision-document structure

**Related workspace notes:** [Bank Mandiri Team Lead round](bank-mandiri/bank-mandiri-ddl-round3-team-lead.md) · [performance optimization](performance-optimization-web-mobile-backend.md) · [Java & Spring for a TS dev](java-spring-basics-for-typescript-devs.md) · [system design basics](system-design-basics-senior-fullstack-interview.md) · [DBO case study](dbo-b2b-platform-system-design-case-study.md)
