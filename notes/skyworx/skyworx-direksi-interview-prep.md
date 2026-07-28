# Skyworx — Direksi Round Prep (Benefit & Offer Discussion)

- **Written:** 2026-07-09
- **Context:** Passed the technical review. HR's message: this session discusses **benefit**, which becomes the reference for the hiring process, plus a light technical overview.
- **What this really is:** in most Indonesian hiring processes, "diskusi benefit yang jadi acuan hiring" = the meeting where your offer number gets shaped. This is closer to a negotiation than an interview. Prepare accordingly.

## 1. What to expect in the room

- **Direksi** (directors/board) usually attend this stage to approve the hire and sign off on compensation — they are not there to re-test your code. Expect: a few minutes of "tell us about yourself / your project" (high-level, not code-level), then the benefit/comp conversation, which is the real point of the meeting.
- The phrase "menjadi acuan untuk proses hiring" is a signal: **whatever number you say here likely becomes your anchor.** Don't throw out a number casually — decide it before you walk in.
- Tone: professional and warm, not defensive. This round is usually friendlier than technical rounds because you already passed the hard part.

## 2. The technical part — "garis besar" only

**HR's exact words: "sedikit teknis, secara garis besar"** — small amount of technical, at a high level. Take this literally. Do NOT re-open the technical mock interview reports and re-drill deep answers (composite indexes, optimistic concurrency, EF Core internals, etc.) — that depth was for the technical round you already passed, and over-answering with that level of detail here can actually read as missing the social cue that this round isn't about that.

The right calibration: **match the depth of whatever they ask.** If they ask a broad question, give a broad answer. Only go deeper if they explicitly ask a follow-up that invites it — and even then, go one level deeper, not all the way back to mock-interview depth.

Do NOT re-prepare deep answers like the technical mock sessions. Prepare a **60-second summary** you can give if asked "coba ceritakan project atau kemampuan teknis kamu":

> "Saya full-stack engineer, sehari-hari kerja dengan Node.js/TypeScript, GraphQL, Prisma, PostgreSQL, dan Docker. Di test kemarin saya membangun API kredit pakai .NET 8 dan EF Core — stack baru buat saya, tapi konsepnya sama seperti yang saya pakai sehari-hari, jadi saya bisa adaptasi cepat. Di pekerjaan saat ini saya menangani sistem B2B commerce dengan beberapa service backend, autentikasi, queue, dan integrasi pihak ketiga — jadi saya cukup terbiasa dengan kompleksitas sistem production."

One sentence of pride to have ready if they ask about strengths: mention you **learned .NET/EF Core from scratch for this test and still handled auth, validation, testing, and system design questions well** — that story shows adaptability, which is exactly what a company hiring you into a different stack (.NET) wants to hear.

If they go deeper anyway, you have the full library: [skyworx-backend-interview-prep.md](skyworx-backend-interview-prep.md) and the three mock interview reports in this same `notes/skyworx/` folder. Skim the top takeaways of those, don't re-study them cold.

## 3. Banking & home loan basics — from zero

You said you don't know anything about home loans or banking. That's fine — here is everything explained from the ground up, so Section 4 (Skyworx's product) makes sense.

### What a loan actually is

**The problem:** a house costs far more than most people can pay at once. A bank solves this by lending the money now, and the buyer pays it back slowly, in installments, over years — with an extra fee (interest) as the bank's profit for taking the risk and waiting.

**KPR** = **Kredit Pemilikan Rumah** = Home Ownership Loan (a mortgage). It's just a loan where the thing being bought (the house) also serves as the security for the loan.

**Who's involved:**
- **Debitur** — the borrower (the person buying the house).
- **Bank / Kreditur** — the lender.
- **Appraiser (penilai)** — an independent person/company the bank hires to check the house is actually worth what's being paid. The bank will not lend more than the house is worth.
- **Notaris** — a notary who legally handles the signing and registers the property transfer/collateral.
- **Developer** — if it's a new house from a housing project, the developer is also part of the paperwork.

### The words that will come up (all explained)

- **Plafon** — the loan amount (how much money is being borrowed). Same word as in your take-home test — same concept, just applied to a house instead of a generic "pengajuan kredit."
- **Uang muka (DP / down payment)** — the portion of the house price the buyer pays upfront, in cash, before the loan covers the rest. Example: house = Rp 500 juta, DP 10% = Rp 50 juta paid upfront, the bank loans the remaining Rp 450 juta.
  - **Current numbers (2026):** banks generally require **10-20% DP** for a normal commercial KPR. But Bank Indonesia's newer LTV (Loan-to-Value) rules allow **0% DP for certain qualifying borrowers**, and the government's subsidized housing program (**FLPP** — Fasilitas Likuiditas Pembiayaan Perumahan, a low-income housing subsidy scheme) can go as low as **1% DP**.
- **Bunga** — interest, the extra percentage charged as the bank's fee for lending. Same field name as your test.
  - **Fixed vs floating:** *fixed* bunga stays the same for a set period (or the whole loan); *floating* bunga can go up or down over time, usually tied to Bank Indonesia's benchmark rate (BI Rate). Floating means your monthly payment can increase later if rates rise — this is a real risk borrowers weigh.
  - **Current typical rates (2026):** conventional bank KPR ~7-11% effective; some banks run fixed-rate promos as low as ~3% for an initial period (e.g. BTN) before switching to floating after a few years.
- **Tenor** — loan duration in months/years. Same field as your test. KPR tenors commonly run **20-25 years** (much longer than typical consumer credit, because houses are expensive and monthly payments need to stay affordable).
- **Angsuran** — the monthly installment amount. Same field as your test — this is literally the number your `AngsuranController` calculates, just for a house-sized `plafon` and a 20-year `tenor` instead of a 5-year one.
- **Agunan / jaminan** — collateral. In a KPR, the house itself is the collateral: if the borrower stops paying, the bank can legally take the house back (foreclosure). This is why the appraisal step matters so much — the collateral must be worth at least what's owed.
- **Akad kredit** — the formal signing ceremony/contract where the loan officially becomes binding (similar to "closing" in Western mortgage terms). For Islamic/sharia KPR, this uses contracts like **Murabahah** (a cost-plus sale contract) or **Musyarakah Mutanaqisah** (a diminishing-partnership contract) instead of conventional interest — worth knowing exists, not worth memorizing deeply unless they ask.
- **SLIK** (Sistem Layanan Informasi Keuangan) — Indonesia's centralized credit history database, run by **OJK** (Otoritas Jasa Keuangan — Indonesia's Financial Services Authority, the regulator for banks and finance companies). Every bank checks a borrower's SLIK record before approving a loan — it shows all their other debts and whether they've ever missed a payment anywhere. SLIK is the modern official name for what people used to informally call "BI Checking" (BI = Bank Indonesia, the central bank — BI used to run this system before it moved to OJK).
- **Additional costs beyond DP and monthly payment:** provisi (an upfront processing fee), biaya administrasi (admin fee), asuransi jiwa (life insurance — so the loan gets paid off if the borrower dies), asuransi kebakaran (fire insurance on the house), notary fees, and the appraisal fee. Combined, these **pre-disbursement costs typically run 5-7% of the approved loan amount** — a fact worth knowing since it shows a KPR isn't just "DP + monthly payment."

### The KPR journey, step by step (this is what a Loan Origination System automates)

1. **Application (pengajuan)** — borrower submits documents: ID, income proof, tax info, the property details. *(This is the `Create` in your test's CRUD.)*
2. **Verification & credit check** — bank checks SLIK for existing debt/payment history, verifies income and employment (banks typically want 2+ years at a stable job).
3. **Appraisal (penilaian agunan)** — the independent appraiser visits and values the property, so the bank knows the collateral is solid.
4. **Credit scoring / committee decision** — the application is scored (like a credit scoring system) and either approved, rejected, or sent back for more documents. This is exactly the **workflow/state machine** concept from your technical round — a real loan application literally moves through defined states (submitted → under review → approved/rejected).
5. **Akad kredit (signing)** — once approved, the formal contract is signed with the notary present, and the collateral is officially registered.
6. **Disbursement (pencairan)** — the bank releases the loan funds (usually paid to the seller/developer, not directly to the buyer).
7. **Repayment (angsuran)** — the borrower pays monthly for the tenor. If payments are missed repeatedly, this can lead to restructuring or, in the worst case, foreclosure on the collateral.

**Realistic timeline (2026):** from submitting documents to signing (akad), the whole process typically takes **2-6 weeks** — roughly 1-2 weeks for verification/approval, 1-2 weeks for appraisal, 1-2 weeks to prepare the signing. This is the exact number a Loan Origination System is built to compress (see Section 4's 58-day → 14.6-day stat).

### Why this matters for the direksi conversation

You don't need to become a banking expert. You need enough to **follow along and ask an intelligent question** if KPR or lending comes up — you now have that. The one sentence that ties it all together:

> "Jadi kalau saya pahami, KPR itu prosesnya mirip dengan yang saya buat di test — plafon, bunga, tenor, angsuran — cuma untuk rumah, dengan tambahan appraisal, pengecekan SLIK, dan collateral rumahnya sendiri. Itu yang membuat saya paham kenapa workflow/state machine itu penting — karena satu aplikasi KPR nyata melewati banyak tahap sebelum benar-benar cair."

## 4. Know their actual product — talking about "your test" vs "their business"

Direksi will likely appreciate you connecting your test to their **real product**, not just your submission. This shows business awareness, not just coding ability — a genuinely senior signal for a board conversation.

**What Skyworx actually sells:**
- **PRIMORDIUM** — their Loan Origination System (LOS). A web-based application that manages the entire **credit approval process** for banks and multifinance companies: Finance Lease, Consumer Finance, Micro, SME, Commercial, and Corporate Loans. This is the *real, production version* of the take-home test you did — "pengajuan kredit" was a miniature PRIMORDIUM.
- **FINTEGRITY** — their integrated core multifinance system (mentioned in earlier research; the broader platform PRIMORDIUM plugs into).
- Key features of PRIMORDIUM worth knowing: **built-in workflow engine** to control and monitor each step of loan processing (reduces delays — this is your "state machine" concept from the technical round, applied at company scale); **integration with external credit checking** — Customer Information File (CIF), credit card data, other loan systems, and **credit bureau / SLIK** (Indonesia's OJK financial information system, formerly BI Checking); **automatic letter/form generation** on approval or rejection.
- 80+ financial institution clients across the region — this is an established, trusted vendor in Indonesian banking IT, not a startup experimenting.

**Why this matters for a home loan (KPR) specifically — a concrete number to drop in conversation:**
- Indonesian banks report that implementing a Loan Origination System took the **KPR approval process from ~58 days down to an average of 14.6 days — an 80.5% reduction.** That statistic is exactly the kind of business impact PRIMORDIUM sells to banks, and it's a great one to mention if KPR or loan processing speed comes up.
- Banks now check **SLIK** (OJK's centralized credit history system — the modern name for what used to be called "BI Checking") as a mandatory part of credit decisioning. A bad SLIK record (including missed payments on other loans, even online loans) is one of the top reasons a KPR application gets rejected. This is precisely the "**integration with external credit checking / credit bureau**" feature PRIMORDIUM provides — you can connect it directly: *"Fitur integrasi credit bureau di PRIMORDIUM itu yang memungkinkan bank langsung cek SLIK debitur saat proses approval — persis yang membuat proses KPR jadi jauh lebih cepat."*
- 2026 KPR context if it comes up: banks are tightening requirements (stable income for 2+ years, installment-to-income ratio capped around 30-40%), and the government just approved a 40-year subsidized home loan program (June 2026) — property financing is a very active area in Indonesian banking right now, which is good context for why a company like Skyworx (serving this exact niche) is growing.

**A good sentence to have ready if asked "kenapa tertarik kerja di Skyworx":**

> "Saya lihat produk utama Skyworx, PRIMORDIUM, itu sebenarnya versi production dari soal test yang saya kerjakan — loan origination system untuk bank dan multifinance. Yang menarik buat saya adalah domain-nya: sistem yang menangani approval kredit itu langsung berhubungan dengan uang dan compliance, jadi correctness dan security bukan opsional — itu sejalan dengan cara saya kerja selama ini."

## 5. Salary — grounding your number in real data

**Market research (2026, Jakarta, backend/software engineer roles):**

| Level | Monthly IDR (rough range) | Source |
|---|---|---|
| Backend Developer (junior-ish) | ~7.6jt – 13.6jt | Glassdoor |
| Backend Engineer (general) | ~8.9jt – 17.4jt | Glassdoor |
| Mid-level Backend Engineer | ~11.2jt – 16.2jt | Glassdoor |
| Software Engineer, all levels (broad market) | ~4.25jt – 20jt, median ~9jt | NodeFlair |
| Senior Backend Developer | ~16jt+ | Glassdoor |
| Lead Backend Engineer | ~18jt – 41jt | Glassdoor |

**How to read this honestly:** these ranges are noisy (they mix junior-to-senior, different industries, different company sizes) — treat them as a sanity check, not gospel. A few things specific to your situation push your number toward the **middle-to-upper** part of the "mid-level" band, not the bottom:

- You have real production experience owning a multi-service system (DBO platform) — architecture, auth, queues, third-party integrations, and a real incident you debugged and fixed. That is senior-leaning evidence, not junior.
- Skyworx is a **specialized fintech/banking software vendor** — this niche typically pays at or slightly above generic web-dev rates, because domain correctness (money, compliance) is valued and harder to hire for.
- You passed a technical round that specifically tested precision on money-handling, security, and system design — you already demonstrated the bar they're paying for.

**A defensible number to bring:** something in the **~15jt – 22jt/month** range as your target, framed as a range with a floor you won't go below (pick your actual floor based on your current comp, cost of living, and how much you want this job — I don't know that number, only you do).

## 6. How to answer "berapa ekspektasi gaji Anda?"

Don't blurt a single number instantly — and don't say "terserah perusahaan" either (that gives up your anchor for free). Use a **range anchored to research + a reason**:

> "Berdasarkan pengalaman saya dan riset pasar untuk role backend engineer di Jakarta, saya melihat kisaran yang wajar di angka [X] sampai [Y] juta per bulan. Saya terbuka untuk diskusi lebih lanjut tergantung keseluruhan benefit package-nya."

Why this works:
- **Gives a range, not a single number** — leaves room to negotiate without looking greedy or underselling yourself.
- **"Tergantung keseluruhan benefit package"** signals you're evaluating total compensation, not just base salary — this is the senior-sounding move, and it opens the door to point 5 below.
- If they push for one number: give the **middle of your range**, not your floor.

**If they ask "apakah bisa nego?"** — yes, always say you're open to discussion. Never say a number is final on the first pass unless it's genuinely your walk-away point.

**If there's a big gap between their offer and your number** — don't reject on the spot. Say: *"Saya perlu waktu sebentar untuk pertimbangkan, boleh saya diskusikan lagi dalam 1-2 hari?"* Never commit under pressure in the room.

### A question to avoid — and why

A tempting move is to ask direksi directly: *"Bagaimana budget untuk menghire, apakah penentuan salary karena budget atau skill?"* **Avoid this exact phrasing.** It implicitly asks "is your number arbitrary/cheap, or based on merit" — in front of a board, that reads as challenging their judgment or fairness, not as negotiating. Direksi are the ones deciding your outcome in this room; putting them on the defensive rarely gets you a better number, and Indonesian corporate culture in a board setting generally rewards a collaborative tone over an interrogative one.

**The safer version that gets the same information:** *"Untuk range gaji di posisi ini, apakah ada fleksibilitas berdasarkan pengalaman dan skill yang saya bawa, atau ini sudah standar yang sama untuk semua kandidat di level ini?"* This asks the same underlying question (fixed budget vs. negotiable-on-merit) but frames it as curiosity about the *process*, not a challenge to their integrity.

### Script: they name a number (e.g. "15") — how to push it up

Don't accept silently, and don't repeat your open-ended range again — negotiate the specific gap:

1. **Acknowledge, don't react negatively.** *"Terima kasih atas tawarannya."* Never show disappointment on your face or in your tone — a flat, professional reaction preserves your negotiating position.
2. **State your reasoning directly, anchored to evidence, not opinion.** *"Berdasarkan riset pasar untuk role backend engineer dengan pengalaman saya, dan mengingat kompleksitas domain fintech yang membutuhkan presisi ekstra pada data uang dan compliance, saya melihat angka yang lebih sesuai ada di kisaran 18 sampai 20 juta. Apakah ada ruang untuk itu?"* — notice this names a **specific number close to your real target**, not just "higher." Vague asks get vague answers; specific asks get specific answers.
3. **If they hold firm on 15 as a hard ceiling** — don't just accept or walk away. Negotiate the **total package** instead of only the base number:
   - *"Kalau base salary di angka itu yang paling maksimal saat ini, apakah ada ruang di komponen lain — misalnya bonus performance, atau review gaji dipercepat setelah 3-6 bulan berdasarkan performance, bukan menunggu 1 tahun?"*
   - This reframes the conversation from "can you move this one number" (a yes/no they might just say no to) to "can we solve this together across several levers" (harder to flatly refuse, and shows you're solution-oriented, which boards like).
4. **If they still hold firm on everything** — you now have real information, not a guess. Decide calmly, and if you need time: *"Saya hargai penjelasannya. Boleh saya pertimbangkan dulu 1-2 hari sebelum memberi keputusan final?"* Never accept or reject in the exact moment you feel pressured.

**The core negotiation principle underneath all of this:** you get better outcomes by naming your own specific number backed by a reason, not by questioning their reasoning. Let evidence do the pushing, not confrontation.

## 7. Benefits checklist — ask about these, don't wait to be told

Total compensation in Indonesia is more than base salary. If they don't cover these, ask:

- **BPJS Kesehatan & Ketenagakerjaan** — is it covered from day one, and is there additional private health insurance?
- **THR** (Tunjangan Hari Raya) — standard by law, but confirm timing/policy.
- **Bonus / insentif tahunan** — performance bonus structure, if any.
- **Cuti** (annual leave) — how many days, and any additional leave types.
- **WFH / hybrid policy** — fully office, hybrid, or remote-friendly? (Relevant since you're comfortable with Docker/CapRover remote-style work.)
- **Equipment** — laptop provided or BYOD/allowance?
- **Training/learning budget** — courses, certifications, conference budget — a good signal for a company that invests in engineers.
- **Career path / jenjang karir** — is there a defined path from Backend Engineer → Senior → Lead? Ask this directly; it signals you're thinking long-term, which boards like to hear.
- **Probation terms** — length of probation and what changes after (often salary or status).

## 8. Questions to ask them — categorized, pick 4-5

**Why this matters more than it seems:** the questions you ask are themselves being evaluated. In a room with direksi specifically, questions about business direction and growth land better than narrow technical questions (save those for a future manager/peer round). Pick a mix across categories — don't ask everything, 4-5 well-chosen questions beats 10.

### A. Role & team clarity (practical, always safe to open with)
- "Untuk role backend engineer ini, apa prioritas utama dalam 3-6 bulan pertama?"
- "Saya akan masuk ke tim yang menangani produk apa — apakah langsung ke PRIMORDIUM, atau ada kemungkinan produk/proyek lain?"
- "Siapa yang akan menjadi atasan langsung saya, dan bagaimana struktur tim engineering-nya?"
- ⭐ **"Menurut Bapak/Ibu, ekspektasi seperti apa yang diharapkan dari saya di posisi ini, supaya saya bisa berkontribusi secara maksimal dan berkembang dengan baik di Skyworx?"** — one of the strongest questions available to you here. It signals growth mindset and alignment-seeking rather than "what do I get," which lands especially well right after a benefits conversation — it shows you're already thinking past the offer toward performing well. **If the answer is vague** ("yang penting kerja keras, tanggung jawab"), a good follow-up: *"Apakah ada tolok ukur atau ekspektasi spesifik yang biasanya dipakai untuk menilai itu di tahun pertama?"* — asking for something measurable shows analytical thinking, not just politeness. Whatever they answer, briefly reflect it back with one sentence on how you'd approach meeting it — that turns the question into a small demonstration of value, not just information-gathering.

### B. Company direction & strategy (the strongest category for a direksi audience — shows business thinking, not just code thinking)
- "Bagaimana Bapak/Ibu melihat arah pengembangan produk Skyworx dalam 1-2 tahun ke depan, terutama dengan tren AI yang mulai masuk ke industri fintech?"
- "Apakah ada rencana ekspansi produk atau segmen pasar baru yang sedang dipersiapkan saat ini?"
- "Dengan semakin ketatnya requirement compliance di industri perbankan, bagaimana Skyworx memastikan tim engineering tetap mengikuti standar tersebut?"

### C. Growth & career path
- "Bagaimana jenjang karir untuk posisi backend engineer di Skyworx dalam 1-2 tahun ke depan?"
- "Selain benefit standar, apakah ada program pengembangan seperti training atau sertifikasi yang didukung perusahaan?"

### D. Product-specific (shows you actually researched them, not generic prep)
- "PRIMORDIUM sudah dipakai 80+ institusi keuangan — apakah role ini akan lebih banyak maintain produk yang sudah production, atau ada inisiatif/fitur baru yang sedang dikembangkan?"

### E. Process (good closer — always appropriate, shows organization)
- "Setelah sesi ini, bagaimana proses dan timeline selanjutnya?"

**Suggested picks for this specific meeting:** the ⭐ expectations question from A (a near-must-ask — it's the single best growth/alignment signal you can send), one from B (this is the category that will impress direksi specifically), one from C (career path — you're already planning to ask this per the HR framing), and always close with E. Skip D unless the conversation naturally opens toward product/technical direction.

## 9. Mindset going in

- You already cleared the hard technical bar. This meeting is about **fit and terms**, not proving competence again.
- Numbers backed by research + real production experience are easy to defend calmly — you don't need to feel awkward stating them.
- Silence after stating your number is fine. Don't fill it by immediately lowering yourself.

## Sources

- [Salary: Back End Engineer in Jakarta, Indonesia 2026 — Glassdoor](https://www.glassdoor.com/Salaries/jakarta-indonesia-back-end-engineer-salary-SRCH_IL.0,17_IM1045_KO18,35.htm) — 2026
- [Salary: Mid Backend Engineer in Jakarta, Indonesia 2026 — Glassdoor](https://www.glassdoor.com/Salaries/jakarta-indonesia-mid-backend-engineer-salary-SRCH_IL.0,17_IM1045_KO18,38.htm) — 2026
- [Salary: Lead Backend Engineer in Jakarta, Indonesia 2026 — Glassdoor](https://www.glassdoor.com/Salaries/jakarta-indonesia-lead-backend-engineer-salary-SRCH_IL.0,17_IM1045_KO18,39.htm) — 2026
- [Software Engineer Salary in Indonesia (2026) — NodeFlair](https://nodeflair.com/salaries/indonesia-software-engineer-salary) — 2026, based on user-submitted verified salaries
- [Primordium — Skyworx](http://www.skyworx.co.id/products/primordium/) — accessed 2026-07-09
- [Products — Skyworx](http://www.skyworx.co.id/products/) — accessed 2026-07-09
- [About — Skyworx](https://www.skyworx.co.id/about/) — accessed 2026-07-09
- [Evaluasi implementasi Consumer Loans Scoring System dalam LOS pada KPR — UGM repository](https://etd.repository.ugm.ac.id/penelitian/detail/36595) — 58 days to 14.6 days LOS impact study
- [Memahami Syarat Pengajuan KPR 2026 — Babel Insight](https://www.babelinsight.id/memahami-syarat-pengajuan-kpr-2026-disetujui-bank) — 2026, KPR requirements
- [Calon Debitur KPR Wajib Penuhi Syarat Ketat di Tahun 2026 — Readers.id](https://www.readers.id/calon-debitur-kpr-wajib-penuhi-syarat-ketat-2026) — 2026, SLIK/credit history context
- [Cara Lengkap Ajukan KPR Rumah Pertama 2026 — Industry.co.id](https://www.industry.co.id/read/152096/cara-lengkap-ajukan-kpr-rumah-pertama-2026-syarat-hitungan-cicilan-dan-tips-disetujui) — 2026, DP/tenor/cost breakdown
- [KPR: Memahami Persyaratan dan Biaya Sejak Awal — GEOTIMES](https://geotimes.id/opini/kpr-memahami-persyaratan-dan-biaya-sejak-awal/) — 2026, pre-disbursement cost breakdown
- [Suku Bunga KPR — Rumahsaya BCA](https://rumahsaya.bca.co.id/id/info-kpr/Sukubunga-kpr) — fixed vs floating rate explanation
