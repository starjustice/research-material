# Bank Mandiri DDL — Technical & User Interview Question Bank

- **Researched:** 2026-07-28
- **Target:** Software Engineer / Senior Software Engineer, IT Digital Channel Delivery (DDL), PT Bank Mandiri (Persero) Tbk
- **Sources freshness:** mostly 2025–2026 (Livin' figures June 2026, OJK rules 2025–2026)
- **Companion note:** [bank-mandiri-ddl-interview-prep.md](bank-mandiri-ddl-interview-prep.md) — company background, AKHLAK values, behavioral answers

## TL;DR

- DDL is confirmed as an internal Bank Mandiri IT department, not a subsidiary. Its job postings are numbered **DDL-01 through DDL-08**, which tells us exactly what the department is made of.
- **DDL's core stack is Java/Spring microservices on the backend and native Android/iOS on mobile — not Node and not React Native.** This is a real gap in your profile. Read section 2 before anything else.
- Your best-fit role is **DDL-07 Web Developer** (React/Angular). Your second angle is learning agility, backed by the real .NET story.
- Expect **broad-but-real technical questions**, not LeetCode. No candidate reports describe an algorithm test for this track.
- Two topics give you an instant senior signal because most candidates miss them: **SNAP** (Bank Indonesia's mandatory open API standard, which is built on idempotency and signed requests) and **PADK OJK 1/2026** (24-hour incident reporting).

---

## 1. What the DDL job codes reveal

Bank Mandiri posts DDL roles publicly with numbered codes. Reading them together gives you an org chart of the department:

| Code | Role | Stack named in the posting |
|---|---|---|
| **DDL-01** | Backend Developer | Java + **Spring Framework** (4.x+), **JMS** messaging, RDBMS (Oracle, MSSQL, PostgreSQL), microservices |
| **DDL-02** | Front End Developer Android/iOS | **Native** mobile: MVVM pattern, reactive programming, custom view components, view binding / data binding |
| **DDL-05** | Production Support | Runs and monitors what's live |
| **DDL-07** | **Web Developer** | Clean code, design patterns, technical documentation, code versioning |
| **DDL-08** | Solution Architect | System design across channels |
| — | Solution Analyst | Translates business needs into technical requirements |
| — | .NET Developer | C# / .NET |

A sister department (ITAPD) posts a web front-end role naming **HTML, CSS, JavaScript, jQuery, Angular, and React.js** — the clearest public signal of what "web developer" means at Mandiri.

**What this tells you about how DDL works:**

- The department is split by channel and layer, with a **Solution Analyst** and **Solution Architect** sitting above the developers. You will not be handed a blank page — you'll receive a solution design and build against it. Say you're comfortable with that.
- **JMS** (Java Messaging Service — a queue system for passing messages between services) appearing in the backend posting confirms they run **asynchronous, event-driven integration**, exactly like the Azure Service Bus work you did at Unloan. That's a genuine connection point.
- Mobile is **native**, and the pattern named is **MVVM** (Model-View-ViewModel — the UI layer only reads from a view model, so business logic stays testable and separate from the screen).

---

## 2. The honest gap — read this before you prepare answers

Your stack and DDL's core stack do not line up as neatly as the previous note implied. Be clear-eyed:

| DDL needs | You have | Verdict |
|---|---|---|
| Java + Spring microservices | Node.js, Express, GraphQL | ❌ **Real gap** — different language and ecosystem |
| Native Android/iOS, MVVM | React Native | 🟡 **Partial** — you know mobile delivery deeply, but not native code |
| React / Angular web | React, Next.js, Apollo | ✅ **Strong match** — this is your lane |
| PostgreSQL / RDBMS | PostgreSQL | ✅ **Strong match** |
| Microservices, async messaging | Unloan: Azure Service Bus, event-driven | ✅ **Strong match** — concept transfers even though the tool differs |
| .NET / C# | Learned for the Skyworx assessment | 🟡 **Proof of learning speed**, not production depth |

**Do not pretend the gap isn't there.** A Solution Architect or senior developer will find out in five minutes. Own it directly instead — this is the strongest version:

> "Saya jujur: pengalaman produksi saya di backend adalah Node.js dan TypeScript, bukan Java/Spring. Tapi konsep yang dipakai di sini sudah saya kerjakan langsung — microservices, komunikasi asynchronous lewat message queue, idempotency untuk operasi finansial. Di Unloan saya pakai Azure Service Bus, yang perannya sama seperti JMS di sini. Dan saya sudah pernah membuktikan bisa pindah ekosistem: saya belajar .NET dan C# dari nol untuk satu technical assessment, dari background Node/TypeScript, dan lolos tahap teknisnya. Jadi yang saya bawa adalah pemahaman arsitekturnya — sintaksnya bisa saya kejar."

Why this works: it gives them the bad news first (credibility), maps concept-to-concept (competence), and closes with evidence rather than a promise.

---

## 3. Technical questions you are most likely to get

Grouped by how likely they are. For each: what they're really testing, and the outline of a strong answer in your own stack.

### 3.1 Very likely — reliability and money correctness

This is the heart of channel delivery, and it's your single strongest area. Lead with the mechanism, always.

**Q: "Kalau user submit transaksi lalu koneksinya putus dan request-nya di-retry, bagaimana Anda mencegah double transaction?"**

Answer outline:
1. Name the principle first: **idempotency** — the same request processed twice must produce the same result as processing it once.
2. Then the three concrete layers you actually built at Unloan:
   - **Idempotency key** — a UUID sent with the request; the server stores it and returns the cached response if it sees the same key again.
   - **Unique constraint in the database** — a structural guarantee, so even if application logic fails, duplicate rows are impossible.
   - **Message-level duplicate detection** — Azure Service Bus rejects duplicate messages inside a time window (JMS has equivalent patterns).
3. Close with the lesson from the DBO/TADA incident: "Duplicate delivery bukan bug pengirim — itu memang kontraknya. Penerima yang harus idempotent."

**Q: "Ceritakan bug produksi paling serius yang pernah Anda tangani."**

Use the TADA double-refund story. Structure: what happened → why the naive check failed (two events read "already processed?" before either committed — a race condition) → how you fixed the data → how you fixed the class of bug (row-level locking so check and write are atomic) → what you'd add next (dedupe on event ID, append-only ledger).

**Q: "Bagaimana Anda deploy tanpa mengganggu transaksi yang sedang berjalan?"**

Rolling deploys, health checks, connection draining, and **expand-migrate-contract** for schema changes — add the new column, migrate, then remove the old one, never a breaking change in one step. Add the banking framing: "Setiap perubahan harus punya jalur rollback, karena downtime di channel bank itu jadi berita nasional."

### 3.2 Very likely — your own architecture

**Q: "Jelaskan arsitektur sistem yang Anda bangun, dan kenapa Anda pisah service-nya seperti itu."**

They're testing whether you split services for operational reasons or because it was fashionable. Use DBO: separate services for API, auth, queue, and third-party integration. Give the *reason* for each split — different scaling needs, different failure isolation, different deploy cadence. Say plainly where a monolith would have been fine. Admitting that is a senior signal.

**Q: "Kalau ada API pihak ketiga yang lambat atau down, apa yang terjadi ke sistem Anda?"**

Timeouts, retries **with exponential backoff**, circuit breaker (stop calling a failing service for a while so you don't pile up requests), queueing the work for later, and a clear user-facing state. Mention **reconciliation** — comparing your records against the partner's afterward to catch anything lost. Banks care deeply about this.

### 3.3 Likely — frontend, since DDL-07 is your best fit

- **React rendering and performance:** why unnecessary re-renders happen, `useMemo`/`useCallback` and when they're *not* worth it, list virtualization, code splitting.
- **State management:** when local state is enough, when you reach for a store, and how Apollo's cache changes the answer (you have real Apollo experience — say so).
- **Next.js rendering strategies:** SSR vs SSG vs client rendering, and which fits a banking web channel (mostly SSR/authenticated — SSG rarely fits personalized financial data).
- **Web performance for Indonesian users:** low-end Android, patchy networks, payload size, why this matters when the channel serves the whole country, not just Jakarta on 5G.

### 3.4 Likely — database

- **Indexing:** what an index is in plain terms (a lookup shortcut), when it helps, and the cost — every write must update it.
- **Transactions and isolation:** why the TADA bug happened, and how row-level locking (`SELECT ... FOR UPDATE`) fixed it. You have a real story here, which beats theory.
- **N+1 queries:** what it is, how it shows up in GraphQL, and how DataLoader batching fixes it.
- **Migrations:** how you run schema changes without downtime.

### 3.5 Possible — JavaScript/TypeScript fundamentals

Standard senior set: closures, the event loop, `async`/`await` versus promises, `Promise.all` versus sequential awaits, and TypeScript generics. Prepare one-paragraph plain-language explanations. These are quick-fire questions — long answers hurt you.

### 3.6 Wildcard — security

Channels are the bank's attack surface, so expect at least one:

- **Authentication vs authorization** — who you are versus what you're allowed to do.
- **Password hashing, never "encryption"** — hashing is one-way. Saying "encrypt passwords" is a red flag in a bank interview.
- **JWT vs sessions** — the tradeoff is revocation: a JWT is valid until it expires unless you keep a denylist.
- **Rate limiting on OTP endpoints** — both fraud prevention and cost control (every SMS costs money).
- **Never logging PII in plain text.** You already do this well — the Unloan practice of debugging via loan ID or user ID instead of real customer data is exactly the right answer.

---

## 4. Two topics that will set you apart

Most candidates won't know these. Each is worth one deliberate mention.

### 4.1 SNAP — Indonesia's mandatory open API payment standard

**What it is:** *Standar Nasional Open API Pembayaran* — the national standard from Bank Indonesia that defines how payment APIs between financial institutions must look. Established by BI Governor Decree No. 23/10/KEP.GBI/2021, and managed by ASPI (the Indonesian Payment System Association) since 1 September 2023. It now connects 71 payment providers.

**Why it matters to you:** SNAP is built on exactly the concepts you already know.

- SNAP APIs are **specified as idempotent by design** — the standard itself requires that repeating a request doesn't duplicate the effect. This is your strongest topic, and it's written into national regulation.
- Every request carries an **`X-SIGNATURE`** header — a signature over the request so the receiver can verify integrity (nothing was altered) and non-repudiation (the sender can't deny sending it). The signature is `HMAC_SHA512` over a string built from HTTP method, endpoint, access token, a SHA-256 hash of the request body, and a timestamp.

**How to use it in one sentence:** *"Saya lihat SNAP mensyaratkan API pembayaran bersifat idempotent dan setiap request ditandatangani — itu persis pola yang saya terapkan di Unloan dengan idempotency key dan verifikasi signature untuk integritas."* Then stop. One line is enough to show you've done your homework.

**Related, worth recognizing by name:** **BI-FAST** (real-time interbank transfers) and **QRIS** (the national QR payment standard) — both are channels DDL would touch.

### 4.2 PADK OJK No. 1/2026 — the new IT rules for commercial banks

OJK (Otoritas Jasa Keuangan, Indonesia's financial services regulator) issued **PADK No. 1 of 2026** covering how commercial banks run IT — planning, building, and monitoring their systems.

The two facts to remember:

- **IT incidents must be reported to OJK within 24 hours** of being discovered.
- **Five required pillars:** data protection, access management, risk management, incident response, and compliance governance.

**Why this is a senior signal:** it shows you understand that in a bank, an outage isn't only an engineering problem — it starts a regulatory clock. Try: *"Yang saya pahami, insiden IT di bank umum harus dilaporkan ke OJK dalam 24 jam. Artinya incident response bukan cuma soal memperbaiki cepat, tapi juga soal dokumentasi dan jejak audit yang rapi sejak menit pertama."*

⚠️ **Use these two topics once each, lightly.** You're showing preparation, not lecturing a banker about banking. If they follow up and you don't know the detail, say so plainly.

---

## 5. User interview questions (the non-technical half)

"User interview" in Indonesian hiring means the interview run by your future manager, not HR. It mixes job-relevant technical questions with fit and working style. Bank Mandiri's process is reported at **3.03/5 difficulty**, **70.8% positive**, averaging **43 days** end to end — and IT Developer candidates rate it among the harder tracks.

Expect these. Each links to the answer you already have:

| Question | Where your answer lives |
|---|---|
| "Ceritakan tentang diri Anda" | Prep note §3 — 60–90 seconds, end by connecting to DDL |
| "Kenapa Bank Mandiri? Kenapa divisi ini?" | Prep note §3 — scale → fit → domain |
| "Kelebihan dan kekurangan Anda" | Prep note §3 — the weakness must have an active fix |
| "Masalah tersulit yang pernah Anda selesaikan" | TADA double-refund |
| "Bagaimana Anda bekerja di bawah tekanan / deadline ketat?" | Production incident handling; how you triage |
| "Bagaimana kalau tidak setuju dengan rekan tim atau atasan?" | Disagree with data, commit once decided |
| "Bagaimana Anda membimbing junior?" | Pair programming to diagnose root cause first |
| "Nilai AKHLAK mana yang paling menggambarkan Anda?" | Amanah + TADA story |
| "5 tahun ke depan?" | Growth into technical leadership **inside Mandiri** — keep it concrete |
| "Ada pertanyaan untuk kami?" | Prep note §4 — always have three |

**The one new question to prepare, given the stack gap:**

**Q: "Tim kami banyak pakai Java dan Spring. Anda dari Node — bagaimana?"**
Use the ownership answer from section 2. Concept transfer + the .NET evidence + a direct statement that you're willing to learn the language properly, not work around it.

**A senior-level closing question to ask them** (also confirms which sub-team you'd join):
> "Divisi ini kan cukup luas — ada backend Java, mobile native, sampai web. Kalau saya bergabung, kira-kira saya masuk ke channel dan layer yang mana?"

---

## 6. Numbers worth knowing (as of June 2026)

Quoting one real figure shows you researched the company. Quoting five sounds rehearsed — pick one.

| Figure | Value | Why it matters |
|---|---|---|
| Livin' registered users | **41 million** (end of June 2026), +24.3% YoY | The scale you'd be building for |
| Transaction value | **Rp 2,083 trillion** (through May 2026), +19.6% YoY | Every bug touches real money |
| Transaction count | **2.2 billion**, +19% YoY | Reliability at volume |
| New users per day | **~27,000** | Growth is constant, not a one-off spike |
| Livin' fee income growth | **+46%** | The channel is a revenue engine, not a cost center |
| 2026 user target | **60 million** | Where the roadmap is heading |
| ATM/CRM · EDC | ~12,900 · ~322,000 | Channels beyond the app |

**Best single line to use:** *"Livin' sekarang 41 juta pengguna dengan 2,2 miliar transaksi setahun — di skala itu, bug kecil pun dampaknya ke jutaan orang. Itu yang membuat saya tertarik."*

---

## 7. Cheatsheet — 10 minutes before the interview

**If asked about reliability, say the mechanism in sentence one:**
> "Idempotency key, unique constraint di database, dan duplicate detection di message queue."

**Three-layer defense against double processing:**
1. Message queue dedup (Service Bus / JMS)
2. Database unique constraint
3. Idempotency key (UUID) to external APIs

**Terms, in plain words:**
- **Idempotent** — doing it twice gives the same result as doing it once.
- **JMS** — Java's message queue system. Same job as Azure Service Bus.
- **MVVM** — the screen reads from a view model; logic stays out of the UI.
- **Circuit breaker** — stop calling a broken service for a while instead of piling up requests.
- **Expand-migrate-contract** — add new, move data, remove old. Never break in one step.
- **Reconciliation** — compare your records against the partner's to catch what got lost.
- **SNAP** — BI's national open API payment standard. Idempotent + signed requests.
- **PADK OJK 1/2026** — IT incidents reported to OJK within 24 hours.

**Never say:**
- "Encrypt the password" → it's **hashing**, one-way.
- "Event-driven architecture" as an answer to a reliability question → that's a category, not a mechanism.
- "I'm a perfectionist" as your weakness.

**Own the gap early, don't wait to be caught:**
> Node/TypeScript in production, not Java/Spring — but same architecture concepts, plus proven ability to switch ecosystems (.NET from zero).

**Your three strongest assets in this room:**
1. The TADA incident — money correctness, honesty, systemic fix.
2. Unloan — you've shipped inside a bank's regulatory environment already (CBA Australia).
3. Lead experience on DBO — you've mentored and shipped, not just coded.

---

## 8. What to do next

1. Practice the **stack-gap answer** (section 2) out loud until it sounds calm, not defensive. This is the highest-risk question you face.
2. Practice the **idempotency answer** leading with the mechanism — your recorded weakness from the 2026-07-28 mock was burying it behind vague framing.
3. Read the SNAP and OJK lines once each so they come out naturally, not recited.
4. Pick **one** Livin' number and memorize only that one.
5. Re-read the TADA story in [dbo-b2b-platform-system-design-case-study.md](../dbo-b2b-platform-system-design-case-study.md).

---

## Sources

- [DDL - 01 - Backend Developer (Java/Microservices) — Kalibrr](https://www.kalibrr.com/c/pt-bank-mandiri-persero-tbk/jobs/108264/ddl-01-backend-developer-java-microservices) — Spring 4.x, JMS, RDBMS requirements
- [DDL - 02 - Frontend Developer Android/iOS — Kalibrr](https://www.kalibrr.com/c/pt-bank-mandiri-persero-tbk/jobs/108266/ddl-02-frontend-developer-android-ios) — MVVM, reactive programming, view binding
- [DDL - 07 - Web Developer — Kalibrr](https://www.kalibrr.com/c/pt-bank-mandiri-persero-tbk/jobs/170215/ddl-07-web-developer) — responsibilities, clean code and design patterns
- [DDL - 08 - Solution Architect — Kalibrr](https://www.kalibrr.com/c/pt-bank-mandiri-persero-tbk/jobs/170216/ddl-08-solution-architect)
- [DDL - Solution Analyst — Kalibrr](https://www.kalibrr.com/c/pt-bank-mandiri-persero-tbk/jobs/170213/ddl-solution-analyst)
- [DDL - .Net Developer — Kalibrr](https://www.kalibrr.com/c/pt-bank-mandiri-persero-tbk/jobs/218233/ddl-net-developer)
- [ITAPD - Programmer Web (Front End) — Kalibrr](https://www.kalibrr.com/c/pt-bank-mandiri-persero-tbk/jobs/112764/itapd-programmer-web-front-end) — HTML, CSS, JS, jQuery, Angular, React.js
- [Bank Mandiri Interview Experience & Questions — Glassdoor](https://www.glassdoor.com/Interview/Bank-Mandiri-Interview-Questions-E40419.htm) — 3.03/5 difficulty, 70.8% positive, 43-day average process
- [Pengguna aplikasi Livin tembus 41 juta per Juni 2026 — ANTARA News](https://www.antaranews.com/berita/5663381/bank-mandiri-pengguna-aplikasi-livin-tembus-41-juta-per-juni-2026) (June 2026)
- [Livin' by Mandiri Tembus 40,3 Juta Pengguna, Nilai Transaksi Rp2.083 T — Bisnis.com](https://finansial.bisnis.com/read/20260615/90/1981018/livin-by-mandiri-tembus-403-juta-pengguna-nilai-transaksi-rp2083-t) (15 June 2026)
- [Bank Mandiri Targetkan Pengguna Livin' Tembus 60 Juta pada 2026 — Kontan](https://keuangan.kontan.co.id/news/bank-mandiri-targetkan-jumlah-pengguna-livin-by-mandiri-tembus-60-juta-pada-2026)
- [Standar Open API Pembayaran Indonesia (SNAP) — ASPI](https://aspi-indonesia.or.id/standar-dan-layanan/standar-open-api-pembayaran-indonesia-snap/) — governance transferred from BI to ASPI, 1 Sept 2023
- [Standar Nasional Open API Pembayaran (SNAP) — Bank Indonesia](https://www.bi.go.id/id/layanan/standar/snap/default.aspx) — official standard
- [Signature SNAP — Faspay docs](https://docs.faspay.co.id/merchant-integration/api-reference-1/snap/signature-snap) — X-SIGNATURE, HMAC_SHA512 string-to-sign format
- [Aturan Baru OJK Dorong Transformasi Digital Bank — SIP Law Firm](https://siplawfirm.id/resources/aturan-ojk-transformasi-digital-perbankan) — PADK OJK 1/2026, 24-hour incident reporting, five pillars
- [Mengenal Sistem Pembayaran Sehari-hari: QRIS hingga BI-FAST — Hypeabis](https://hypeabis.id/read/50134/mengenal-sistem-pembayaran-sehari-hari-qris-hingga-bi-fast)
- Related workspace notes: [bank-mandiri-ddl-interview-prep.md](bank-mandiri-ddl-interview-prep.md), [dbo-b2b-platform-system-design-case-study.md](../dbo-b2b-platform-system-design-case-study.md), [mock-interview-bank-mandiri-2026-07-28.md](mock-interview-bank-mandiri-2026-07-28.md)
