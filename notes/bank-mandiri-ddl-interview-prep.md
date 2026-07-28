# Bank Mandiri IT DDL — Department Head Interview Prep

- **Written:** 2026-07-28
- **Interview:** Department Head 1, 20:30 WIB, Microsoft Teams
- **⚠️ DATE WARNING:** the invitation says "Selasa, 28 Juni 2026" — but **28 June 2026 was a Sunday**, while **28 July 2026 is a Tuesday (today)**. "Juni" is almost certainly a typo for "Juli". **Confirm with HR immediately** if you have not already.

## 0. The single most important thing to understand

**DDL = Digital Development Leadership.** This is not a regular engineer vacancy. It is a **leadership development program** — Bank Mandiri's fast-track path for building future IT leaders across software development, cybersecurity, data, and digital banking.

**What that changes:** a Department Head interviewing for a leadership program is not primarily checking whether you can code. They are checking:

1. **Leadership potential** — do you take ownership, mentor others, make decisions?
2. **Learning agility** — can you grow into areas you don't know yet?
3. **Commitment** — will you stay and grow with Mandiri? (BUMN programs invest heavily in people; attrition is a real concern for them.)
4. **Culture fit** — specifically AKHLAK (Section 2).
5. **Genuine interest in banking/digital transformation** — not just "I want a stable job."

Technical depth matters, but it is the *floor*, not the differentiator. Your differentiator is leadership and motivation.

---

## 1. Prepare your "business idea" — the most commonly reported ODP IT question

**Multiple candidate reports say ODP/IT candidates are asked to propose a business idea** — a product, feature, or service Bank Mandiri could develop. Even if it isn't formally asked, having one ready is the strongest thing you can bring tonight.

**Know their two flagship digital products first:**
- **Livin' by Mandiri** — the retail/consumer super app (transfers, payments, investments, lifestyle).
- **Kopra by Mandiri** — the wholesale/corporate platform for business customers (cash management, trade, supply chain).

**Your unfair advantage:** you have built a real **B2B commerce platform with a loyalty/points system and third-party payment integrations** (DBO). That maps *directly* onto Kopra's world — B2B, merchants, supply chain, transactions. Most candidates only know the consumer side. Lead with this.

### Three idea options, pick one and go deep

**Option A — Supply chain financing for small merchants (strongest fit for your background)**
> "Di sistem B2B yang saya bangun, toko material memesan stok dari brand — dan masalah terbesarnya adalah cash flow: toko harus bayar di depan sebelum barangnya laku. Ide saya: fitur di Kopra yang memberi *invoice financing* otomatis untuk merchant kecil, berdasarkan riwayat transaksi mereka di platform, bukan berdasarkan agunan. Data transaksinya sudah ada di sistem — itu yang jadi dasar credit scoring-nya."

Why it's strong: it solves a real problem you've personally seen, uses data the bank already has, and it's a genuine banking product (financing), not just an app feature.

**Option B — Merchant loyalty/points as a banking product**
> Extend your TADA points experience: a unified loyalty layer where merchants on Kopra can run point programs settled through Mandiri, giving the bank transaction data and merchants a retention tool.

**Option C — Developer/API platform (open banking)**
> Mandiri as the API provider for fintechs and merchants — the "Stripe of Indonesian banking." You know API design, auth, webhooks, and idempotency from real work, so you can speak concretely about what makes a developer platform good.

**Structure your pitch in 60-90 seconds:** problem → who has it → your solution → why Mandiri specifically is positioned to do it → how you'd start small (MVP). Do not over-engineer; they want thinking, not a full spec.

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

> "Saya full-stack engineer dengan pengalaman utama di JavaScript dan TypeScript — React, Next.js, React Native untuk frontend, dan Node.js, GraphQL, PostgreSQL untuk backend. Proyek terbesar saya adalah platform B2B commerce di mana pemilik toko material memesan stok langsung dari brand — saya menangani arsitektur backend-nya: beberapa service terpisah untuk API, autentikasi, queue, dan integrasi dengan tiga sistem pihak ketiga untuk pembayaran poin, order, dan OTP. Yang membuat saya tertarik dengan program DDL ini adalah kombinasinya: saya ingin terus berkembang secara teknis, tapi juga tumbuh ke arah kepemimpinan — dan skala Bank Mandiri membuat dampaknya jauh lebih besar daripada yang bisa saya capai sekarang."

### "Kenapa Bank Mandiri? Kenapa program DDL?"
This is the question they most want a real answer to. Cover three layers:
- **Scale/impact:** "Livin' punya puluhan juta pengguna — setiap keputusan teknis berdampak ke jutaan orang. Itu tantangan engineering yang berbeda levelnya."
- **Growth path:** "DDL bukan sekadar posisi engineer, tapi jalur pengembangan kepemimpinan IT. Saya ingin tumbuh ke arah itu, dan program terstruktur dengan mentoring dari IT leader berpengalaman itu yang saya cari."
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
They are hiring for a leadership program — expect this. Use your code review philosophy: praise what works first, explain the *why* behind changes, ask rather than command, separate must-fix from nice-to-have, and for big feedback talk directly instead of leaving 30 written comments.

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

- "Untuk program DDL ini, seperti apa struktur pengembangannya — rotasi antar bidang seperti software development, data, dan cybersecurity, atau fokus di satu area?"
- "Prioritas transformasi digital Bank Mandiri dalam 1-2 tahun ke depan seperti apa, dan di mana peran tim IT dalam mendukungnya?"
- "Menurut Bapak/Ibu, karakteristik apa yang membedakan peserta DDL yang berhasil dengan yang biasa saja?"

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

## Sources

- [BUMN Bank Mandiri Buka Rekrutmen Digital — Jadi BUMN](https://jadibumn.id/bumn-bank-mandiri-rekrutmen-digital/) — 2026, DDL = Digital Development Leadership, program scope (software development, cybersecurity, data, digital banking)
- [Rekrutmen ODP Bank Mandiri 2026 — Loker BUMN](https://bumn.situscarikerja.com/2026/05/rekrutmen-officer-development-program-bank-mandiri-2026/) — 2026, ODP/IT priority and digital recruitment process
- [Pengalaman Rekrutmen ODP IT Bank Mandiri — ohyouka](https://www.ohyouka.com/2019/10/pengalaman-rekrutmen-odp-it-bank-mandiri.html) — candidate report: business idea requirement, Indonesian + English interview
- [Nilai-nilai Budaya Perusahaan — Bank Mandiri (official PDF)](https://www.bankmandiri.co.id/documents/20143/357655335/Nilai-nilai+Budaya+Perusahaan.pdf/a57a3977-dfd9-6598-e825-0ec8d1c7d355) — official AKHLAK implementation
- [AKHLAK BUMN: Pengertian dan Contoh — Glints](https://glints.com/id/lowongan/akhlak-bumn/) — AKHLAK definitions, SE-7/MBU/07/2020
- Personal experience notes: [dbo-b2b-platform-system-design-case-study.md](dbo-b2b-platform-system-design-case-study.md) (TADA incident, architecture), [skyworx-backend-interview-prep.md](skyworx-backend-interview-prep.md) (.NET learning story)
