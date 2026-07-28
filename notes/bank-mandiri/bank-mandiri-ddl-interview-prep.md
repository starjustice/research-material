# Bank Mandiri IT DDL — Department Head Interview Prep

- **Written:** 2026-07-28
- **Interview:** Department Head 1, 20:30 WIB, Microsoft Teams
- **⚠️ DATE WARNING:** the invitation says "Selasa, 28 Juni 2026" — but **28 June 2026 was a Sunday**, while **28 July 2026 is a Tuesday (today)**. "Juni" is almost certainly a typo for "Juli". **Confirm with HR immediately** if you have not already.

## 0. What DDL most likely means — and why it matters

**DDL = Digital Channel Delivery** (most likely). Evidence: an employee community account on Instagram is labeled "CNT IT Digital Channel Delivery" with the handle `lifewithddl`, and Bank Mandiri's IT organization lists digital channel delivery as a core function. Decisively, your invitation says you're meeting a **"Department Head"** — that means DDL is a *department you would join*, not a training program cohort (those are interviewed by HR panels).

> **Honest caveat:** I initially read DDL as "Digital Development Leadership" based on a recruitment blog about Mandiri's ODP program. That was an assumption, not verified. If HR's email or the job posting says otherwise, trust that over this note. A safe opening move tonight: *"Boleh saya konfirmasi dulu, Pak/Bu — divisi Digital Channel Delivery ini fokusnya di channel apa saja?"* Asking is not weakness; it shows you want to understand the actual scope.

> **Update — 2026-07-28, post-mock-interview:** You asked whether DDL might be a separate subsidiary ("anak perusahaan") of Mandiri rather than an internal department. Checked directly — it is **not** a subsidiary. Two direct proof points: (1) a Kalibrr job posting titled **"DDL - 07 - Web Developer"** lists the employer as **"PT Bank Mandiri (Persero) Tbk"** itself, the parent bank — not a separately incorporated company; (2) a real employee's listed title is **"IT Digital Channel Delivery Solution Analyst at Bank Mandiri"** (ZoomInfo), again under Bank Mandiri directly. Bank Mandiri does have real subsidiaries (Mandiri Sekuritas, AXA Mandiri, Mandiri Tunas Finance, Bank Mandiri Taspen, Mandiri Capital Indonesia, etc.) — DDL is not one of them. This confirms the original "Digital Channel Delivery = internal IT department" reading with direct evidence, not just inference.

### What "digital channel" means in banking

A **channel** is any touchpoint where a customer interacts with the bank. Bank Mandiri's channels:

| Channel | What it is | Scale |
|---|---|---|
| **Livin' by Mandiri** | The retail mobile super app — transfers, payments, investments, lifestyle | Their flagship consumer product |
| **Kopra by Mandiri** | The wholesale/corporate platform — cash management, trade, supply chain | Business customers |
| **ATM / CRM** | Cash machines (CRM also accepts deposits) | ~12,900 units nationwide |
| **EDC** | Card machines at merchants | ~322,000 machines |
| **Internet banking** | Web-based banking (evolved from Mandiri Online) | Retail + corporate |
| **SMS banking, e-Money, Mandiri Debit/Kartu Kredit** | Older and card-based channels | Still widely used |

**Digital Channel Delivery = the IT department that builds and ships these customer-facing channels.** Mobile apps, web frontends, the APIs behind them, and the integrations that connect them to the bank's core systems.

### Why this is genuinely good news for you

This role maps to your actual skillset far better than a generic leadership program would:

- **React Native** → mobile channel (Livin' is a mobile app)
- **React / Next.js** → internet banking and web channels
- **Node / GraphQL / REST APIs** → the API layer feeding every channel
- **Third-party integrations** (payments, OTP, orders in your DBO platform) → exactly what channel delivery does all day
- **Your DBO platform is structurally the same shape:** a mobile app + a CMS + an admin panel, all served by a backend that integrates external providers. That is multi-channel delivery in miniature.

**What the Department Head is assessing:** can you build and ship reliable customer-facing systems, do you understand that channels touch real money, and will you fit the team. Technical substance matters more here than in a leadership-program interview — but so does reliability thinking, because a channel outage is front-page news for a bank.

---

## 1. Channel-delivery topics to be ready for (the technical core)

A Department Head who owns channel delivery cares about things a generic interview would skip. Have a view on each:

**Reliability — the defining constraint.** A channel outage at a bank is national news and a regulator conversation. Say this out loud; it shows you understand the stakes:
> "Di channel perbankan, availability itu bukan sekadar metrik — kalau Livin' down satu jam, itu jadi berita. Jadi setiap perubahan harus punya jalur rollback, dan deploy tidak boleh mengganggu transaksi yang sedang jalan."

You can speak from real experience here: rolling deploys, health checks, connection draining, and expand-migrate-contract for schema changes (never a breaking migration in one step).

**Mobile release reality — a genuine strength of yours.** You know something many backend candidates don't: what can and cannot ship instantly to a mobile channel.
> "Yang saya pahami dari React Native: perubahan JavaScript bisa dikirim lewat OTA update tanpa review app store, tapi apa pun yang menyentuh kode native harus lewat build baru dan review Apple/Google. Untuk channel banking itu penting — karena artinya perbaikan urgent harus direncanakan berdasarkan jenis perubahannya."

**Integration with core banking.** Channels are the *front*; the core banking system holds the money. Channel delivery lives on that boundary — APIs, timeouts, retries, and reconciliation. Your third-party integration experience (payments, orders, OTP) is directly analogous. The key line: **money operations must be idempotent**, because a retry must never double-charge.

**Security.** Channels are the bank's attack surface. Be ready to mention: authentication vs authorization, password **hashing** (never "encryption"), token expiry, rate limiting on OTP endpoints (both fraud and cost), and never logging PII in plain text.

**Indonesian user reality.** Channels serve the whole country, not just Jakarta on 5G: low-end Android devices, patchy networks, offline-tolerant flows. If you've thought about performance and payload size in React Native, say so — it shows you think about actual users.

## 1b. Optional: a product idea, if the conversation opens toward it

Some Mandiri IT candidates report being asked to propose a product or feature idea. Less certain for a department interview than for ODP, but cheap to have ready — and it's a strong way to show initiative if the conversation allows.

**Your unfair advantage:** you built a B2B platform with loyalty points and payment integrations, so you can speak to **Kopra's** world (merchants, supply chain), not just the consumer app most candidates default to.

- **Supply chain financing (strongest fit):** *"Di sistem B2B yang saya bangun, masalah terbesar toko adalah cash flow — harus bayar stok di depan sebelum barangnya laku. Ide saya: invoice financing di Kopra yang di-score dari riwayat transaksi merchant di platform, bukan dari agunan. Datanya sudah ada di sistem."*
- **Merchant loyalty as a banking product:** a unified points layer merchants run through Mandiri — retention for them, transaction data for the bank.
- **Open banking / API platform:** Mandiri as the API provider for fintechs; you can speak concretely about auth, webhooks, and idempotency from real work.

**Pitch shape, 60-90 seconds:** problem → who has it → solution → why Mandiri is positioned for it → how you'd start small. Thinking, not a full spec.

---

## 2. AKHLAK — the BUMN core values (near-certain to come up)

All Indonesian BUMN share these mandatory core values, established by Ministry of BUMN Circular SE-7/MBU/07/2020. **Memorize the six and have one story for at least three.**

| Value | Meaning | Your story |
|---|---|---|
| **A — Amanah** | Trustworthy; integrity, honesty, responsibility | The TADA double-refund incident: you found a bug that gave stores *more* points than they should have. You didn't hide it — you fixed the data and then fixed the system so it couldn't recur. That is integrity with money. |
| **K — Kompeten** | Keep learning and developing capability | You learned .NET/C# and Entity Framework from scratch for a technical assessment, coming from a Node/TypeScript background — and passed the technical round. |
| **H — Harmonis** | Care for others, respect differences | Code review approach: explain the *why*, ask rather than command, separate blocking issues from suggestions so juniors aren't overwhelmed. |
| **L — Loyal** | Dedicated, prioritizing nation and state interests | Frame: wanting to build technology that serves Indonesians at national scale, not just private clients. |
| **A — Adaptif** | Innovate, embrace change | Same .NET story, or: moved from monolith thinking to service-oriented architecture as the product's needs changed. |
| **K — Kolaboratif** | Build strategic cooperation | Working across three frontends (mobile app, CMS, verification admin) plus three external partners (payments, orders, OTP) — coordination was the job. |

**Memory hook:** *"Amanah Kompeten Harmonis Loyal Adaptif Kolaboratif"* — A-K-H-L-A-K.

**Do not just recite definitions.** If asked "which AKHLAK value best describes you?", pick one, then immediately tell a 30-second real story. Story beats definition every time.

---

## 3. Likely questions and how to answer

### "Ceritakan tentang diri Anda"
60-90 seconds, structured: who you are professionally → what you've built → why you're here.

> "Saya full-stack engineer dengan pengalaman utama di JavaScript dan TypeScript — React, Next.js, React Native untuk frontend, dan Node.js, GraphQL, PostgreSQL untuk backend. Proyek terbesar saya adalah platform B2B commerce di mana pemilik toko material memesan stok langsung dari brand — saya menangani arsitektur backend-nya: beberapa service terpisah untuk API, autentikasi, queue, dan integrasi dengan tiga sistem pihak ketiga untuk pembayaran poin, order, dan OTP. Yang membuat saya tertarik dengan Digital Channel Delivery adalah kemiripannya dengan yang sudah saya kerjakan — aplikasi mobile, web admin, dan API yang menghubungkan ke sistem pihak ketiga — tapi di skala yang jauh berbeda. Kalau di tempat saya sekarang penggunanya ribuan toko, di Livin' itu puluhan juta orang, dan tingkat keandalan yang dituntut jauh lebih tinggi. Itu tantangan yang saya cari."

### "Kenapa Bank Mandiri? Kenapa divisi ini?"
This is the question they most want a real answer to. Cover three layers:
- **Scale/impact:** "Livin' punya puluhan juta pengguna — setiap keputusan teknis berdampak ke jutaan orang. Itu tantangan engineering yang berbeda levelnya."
- **Fit:** "Yang saya kerjakan sekarang bentuknya mirip — mobile app, web admin, API, integrasi pihak ketiga — jadi saya bisa langsung berkontribusi, tapi dengan tuntutan keandalan dan keamanan yang jauh lebih tinggi. Itu yang membuat saya ingin pindah ke skala ini."
- **Domain:** "Saya sudah bekerja dengan sistem yang menangani uang dan poin — di situ correctness bukan opsional. Perbankan adalah versi paling serius dari masalah itu."

### "Apa kelebihan dan kekurangan Anda?"
- **Kelebihan:** learning agility, with the .NET proof point. Or ownership — you don't just report bugs, you fix the class of bug.
- **Kekurangan — pick a real one with an active fix, never "saya terlalu perfeksionis":**
  > "Saya cenderung ingin memahami detail teknis sampai dalam sebelum mengambil keputusan, dan kadang itu membuat saya lebih lambat di awal. Yang saya lakukan sekarang: saya set batas waktu untuk riset, ambil keputusan dengan informasi yang ada, dan siap koreksi kalau ternyata salah — karena keputusan yang tertunda juga punya biaya."

### "Ceritakan masalah tersulit yang pernah Anda selesaikan"
Use the **TADA double-refund incident** — it's your best story and it's real:
- **Situasi:** duplicate webhook events from a partner arrived at the same moment; both passed the "already processed?" check because neither had committed yet; stores received double points.
- **Tindakan:** traced it through point history to two identical events milliseconds apart; wrote a script to correct affected balances; added row-level locking so the check and the write happen atomically.
- **Hasil & pelajaran:** "Yang saya pelajari: duplicate delivery itu bukan bug pengirim — itu memang kontraknya. Penerima yang harus idempotent." Then mention the stronger layers you'd add: dedupe on event ID, guarded state transition, append-only ledger.

This story is *perfect* for a bank: it's about money correctness, integrity, and systemic prevention.

### "Bagaimana Anda memimpin atau membantu rekan tim?"
A department head cares whether you make the team better, not just yourself. Use your code review philosophy: praise what works first, explain the *why* behind changes, ask rather than command, separate must-fix from nice-to-have, and for big feedback talk directly instead of leaving 30 written comments.

### "Di mana Anda melihat diri Anda 5 tahun ke depan?"
BUMN cares about retention. Signal growth *within* the organization:
> "Saya ingin dalam 3-5 tahun sudah memimpin tim engineering — bukan hanya secara teknis, tapi juga membimbing engineer yang lebih junior. Program DDL ini jalurnya ke sana, dan itu sebabnya saya tertarik."

### Technical questions (expect broad, not deep)
A Department Head will ask *garis besar* level. Be ready to explain simply:
- Your architecture and **why** you split services the way you did (operational need, not dogma).
- How you handle security/authentication (JWT, hashing — never "encrypt" for passwords).
- How you'd approach scale.
Match their depth — don't dive into composite indexes unless invited.

---

## 4. Questions to ask them (prepare 3)

- "Divisi Digital Channel Delivery ini menangani channel apa saja — apakah fokus ke Livin', atau mencakup internet banking dan channel lain juga?" *(Also doubles as your DDL-scope confirmation.)*
- "Untuk tim ini, tantangan teknis terbesar dalam 1-2 tahun ke depan apa — lebih ke skala, keandalan, atau kecepatan rilis fitur baru?"
- "Menurut Bapak/Ibu, karakteristik apa yang membedakan engineer yang berhasil di tim ini dengan yang biasa saja?"

That last one is strong — it signals you're thinking about how to succeed, not just how to get in.

---

## 5. Logistics and delivery

- **Language:** reports say Mandiri interviews mix **Indonesian and English**. Be ready to switch — practice your "tell me about yourself" in *both* languages before tonight.
- **Microsoft Teams:** test the link, camera, mic, and lighting **before 20:30**. Join 5 minutes early. Have a quiet space and a plain background.
- **Evening interview (20:30):** the Department Head is likely fitting this after a full day. Be energetic and concise — don't ramble.
- **Dress:** formal (kemeja). BUMN culture is more formal than tech startups.
- **Have on hand:** your CV printed or on a second screen, plus one page of notes with your business idea and AKHLAK stories.

---

## 6. Last 30 minutes checklist

1. Say your "tentang diri Anda" out loud twice — once in Indonesian, once in English.
2. Say your business idea out loud once, timed at 90 seconds.
3. Recite AKHLAK: Amanah, Kompeten, Harmonis, Loyal, Adaptif, Kolaboratif — and which story goes with which.
4. Reread the TADA incident story so it's fresh.
5. Test Teams link + camera + mic.
6. Have your 3 questions written where you can see them.

**Mindset:** they invited you — the CV already passed. Tonight is about whether you're someone they want to invest in and grow. Be concrete, be honest, and show that you want to build things that matter at scale.

---

## 7. Interview stages — where tonight's round fits, and what may come next

Bank Mandiri's hiring process commonly includes a stage literally called **"User Interview"** — conducted by the hiring manager or department head, not HR. Tonight's Department Head round on Teams almost certainly **is** that stage. It matches how candidates describe it: CV and experience review, culture/team fit, and how you'd contribute day to day — exactly the ground your mock interview just covered.

If a separate **"Technical Discussion"** round follows (common in Indonesian corporate/BUMN hiring — usually run by a senior engineer or tech lead rather than the department head), expect it to go noticeably deeper than tonight:

- **JS/TS fundamentals:** closures, event loop, async/promises, generics — the standard senior JS set.
- **React / React Native internals:** rendering behavior, hooks pitfalls, performance — relevant since DDL owns Livin', a mobile channel.
- **API design:** REST vs GraphQL tradeoffs, N+1 problems, auth patterns (JWT vs sessions) — you have real answers from your GraphQL/Prisma work.
- **Database:** PostgreSQL indexing, transactions, migrations — pull from DBO and Unloan.
- **Small-scope system design:** e.g. "design an OTP verification flow" or "make a payment endpoint idempotent" — you already have the right answer for this (Service Bus dedup, DB unique constraint, idempotency key from Unloan). Lead with the mechanism immediately, don't wait to be asked three times.
- **Code walkthrough:** be ready to screen-share and explain a piece of your own code — DBO or Unloan are your strongest, most relevant choices.

➡️ **Full question bank with model answers:** [bank-mandiri-ddl-technical-user-interview-questions.md](bank-mandiri-ddl-technical-user-interview-questions.md) — includes the DDL job-code stack breakdown (Java/Spring + native mobile), the honest stack-gap answer, SNAP and OJK talking points, and June 2026 Livin' figures.

**Confidence note:** no Bank Mandiri-specific reports confirm a separate live-coding/LeetCode-style test for this track — accounts describe the process as CV- and experience-focused rather than algorithmic. Don't over-invest in grinding algorithm problems; invest in explaining your real systems clearly, which is where you're strongest.

---

## Sources

- [Bank Mandiri IT organization — The Org](https://theorg.com/org/bank-mandiri-persero-tbk-pt/teams/information-technology) — digital channel delivery listed as a core IT function
- [lifewithddl — "CNT IT Digital Channel Delivery" (Instagram)](https://www.instagram.com/lifewithddl/) — employee community account confirming the department name
- [E-Channel Bank Mandiri overview](https://www.inilah.com/inilah-akses-alternatif-bertransaksi-lewat-e-channel-bank-mandiri) — channel list (ATM, SMS banking, Livin, e-Money, Kopra)
- [Bank Mandiri digital transformation history — Kontan](https://keuangan.kontan.co.id/news/lanjutkan-transformasi-digital-perbankan-bank-mandiri-perkenalkan-livin-by-mandiri) — channel evolution, 12,900 ATM/CRM and 322,000 EDC scale
- [Rekrutmen ODP Bank Mandiri 2026 — Loker BUMN](https://bumn.situscarikerja.com/2026/05/rekrutmen-officer-development-program-bank-mandiri-2026/) — 2026, ODP/IT priority and digital recruitment process
- [Pengalaman Rekrutmen ODP IT Bank Mandiri — ohyouka](https://www.ohyouka.com/2019/10/pengalaman-rekrutmen-odp-it-bank-mandiri.html) — candidate report: business idea requirement, Indonesian + English interview
- [Nilai-nilai Budaya Perusahaan — Bank Mandiri (official PDF)](https://www.bankmandiri.co.id/documents/20143/357655335/Nilai-nilai+Budaya+Perusahaan.pdf/a57a3977-dfd9-6598-e825-0ec8d1c7d355) — official AKHLAK implementation
- [AKHLAK BUMN: Pengertian dan Contoh — Glints](https://glints.com/id/lowongan/akhlak-bumn/) — AKHLAK definitions, SE-7/MBU/07/2020
- Personal experience notes: [dbo-b2b-platform-system-design-case-study.md](../dbo-b2b-platform-system-design-case-study.md) (TADA incident, architecture), [skyworx-backend-interview-prep.md](../skyworx/skyworx-backend-interview-prep.md) (.NET learning story)
- [DDL - 07 - Web Developer — Kalibrr job posting](https://www.kalibrr.com/c/pt-bank-mandiri-persero-tbk/jobs/170215/ddl-07-web-developer) — confirms DDL is a job code/department under "PT Bank Mandiri (Persero) Tbk" directly, not a subsidiary
- [Kristian Ndapamerang — IT Digital Channel Delivery Solution Analyst at Bank Mandiri (ZoomInfo)](https://www.zoominfo.com/p/Kristian-Ndapamerang/10014052839) — real employee title confirming department name and parent-company employment
- [Bank Mandiri Interview Experience & Questions — Glassdoor](https://www.glassdoor.com/Interview/Bank-Mandiri-Interview-Questions-E40419.htm) — candidate reports on process stages, difficulty, and focus areas
- [FAQ Mandiri Karir](https://www.bankmandiri.co.id/en/faq-mandiri-karir) — official recruitment process reference
