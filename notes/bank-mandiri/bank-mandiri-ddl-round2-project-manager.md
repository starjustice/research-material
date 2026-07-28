# Bank Mandiri DDL — Round 2: Project Manager Interview

- **Written:** 2026-07-28
- **Round:** Interview 2 of 3 — with a **Project Manager**
- **Round 1 status:** ✅ done (Department Head, simple introduction)
- **Next round:** [Round 3 — Team Lead](bank-mandiri-ddl-round3-team-lead.md) *(different interview, different preparation)*
- **Companion notes:** [DDL company prep](bank-mandiri-ddl-interview-prep.md) · [technical question bank](bank-mandiri-ddl-technical-user-interview-questions.md)

> ⚠️ **This note is only for the PM round.** A PM does not test your code. If you prepare technical depth for this round, you'll answer the wrong questions. Technical preparation lives in the [Team Lead note](bank-mandiri-ddl-round3-team-lead.md).

## TL;DR

- A PM is assessing one thing in many disguises: **"will this person make my project predictable?"**
- The highest-value answer you can give all round: **bad news early, with options attached.**
- Expect questions about estimation, missed deadlines, scope changes, and explaining technical problems to non-technical people.
- Your **DBO team lead experience** is the centerpiece here — you led a team through maintenance and feature delivery. That's real delivery experience, and it matters more to a PM than any algorithm.
- Two things almost no candidate mentions that will land well: **mobile app store release constraints**, and **why banking delivery is slower on purpose**.

---

## 1. Who you are talking to, and what they actually want

A Project Manager owns **schedule, scope, and coordination**. They are judged on whether projects ship when promised. They are not judged on how elegant your code is.

So every question they ask is really one of these five:

| What they ask about | What they're really checking |
|---|---|
| Estimation | Can I trust your numbers when I plan? |
| Delays and blockers | Will you warn me early, or surprise me? |
| Scope changes | Will you push back usefully, or just silently miss the date? |
| Explaining technical things | Can I take what you say into a meeting with business people? |
| Working with QA, analysts, designers | Will you create friction in my team? |

**The single trait a PM values most: predictability.** An engineer who says "5 days" and delivers in 5 days is worth more to a PM than one who says "2 days" and delivers in 6. Let that idea shape every answer you give.

### Important context for DDL specifically

DDL has **Solution Analysts** and **Solution Architects** as separate roles. That means:

- Requirements arrive as a written solution design. You are not expected to invent the business logic.
- There is a defined process from business need → solution analyst → developer → QA → release.
- A PM will want to hear that you're **comfortable working inside a process**, not that you prefer to figure things out alone.

Say this if it fits naturally:
> "Saya nyaman bekerja dengan requirement yang sudah disiapkan analyst. Yang biasa saya lakukan di awal: baca dulu keseluruhannya, lalu ajukan pertanyaan untuk bagian yang belum jelas sebelum mulai coding — karena memperbaiki salah paham di awal jauh lebih murah daripada setelah selesai dikerjakan."

---

## 2. Question bank — with full model answers

Answers are written in Indonesian because the interview will most likely be in Indonesian. Adapt the wording; don't memorize word for word.

### A. Estimation and planning

**Q: "Bagaimana cara Anda melakukan estimasi untuk sebuah task atau fitur?"**

The structure that impresses a PM:

1. **Break it down.** Big tasks hide risk; small tasks expose it.
2. **Separate what you know from what you're guessing.** This is the key move.
3. **State the risky part explicitly.**
4. **Give a confidence level, not just a number.**

> "Pertama saya pecah dulu fiturnya jadi bagian-bagian kecil, karena task besar itu biasanya menyembunyikan risiko. Lalu saya pisahkan mana bagian yang sudah pernah saya kerjakan — itu estimasinya cukup akurat — dan mana yang belum, misalnya integrasi ke sistem yang belum pernah saya sentuh.
>
> Untuk bagian yang belum pernah, saya sampaikan terbuka bahwa ada ketidakpastian. Contohnya: 'Bagian API-nya saya cukup yakin 2 hari. Tapi integrasi ke core system saya belum tahu dokumentasinya selengkap apa, jadi bisa 2 hari bisa 4. Kalau mau lebih pasti, saya bisa cek dulu setengah hari lalu kasih angka yang lebih akurat.'
>
> Yang saya hindari adalah memberi satu angka bulat tanpa konteks — karena PM tidak bisa mengambil keputusan dari angka seperti itu."

**Why this works:** you've given the PM something they can plan with, and you've shown you understand their job.

**Q: "Kalau Anda diminta estimasi tapi requirement-nya belum jelas, apa yang Anda lakukan?"**

> "Saya tidak akan memberi estimasi angka pasti di atas requirement yang belum jelas — itu justru menyesatkan. Yang saya lakukan: sampaikan bagian mana yang belum jelas dan pengaruhnya ke estimasi. Misalnya, 'Kalau validasinya cuma di sisi client, ini 2 hari. Tapi kalau harus ada pengecekan ke sistem lain, bisa 5 hari. Boleh saya konfirmasi dulu ke analyst?'
>
> Kalau memang butuh angka cepat untuk perencanaan awal, saya kasih estimasi kasar dengan catatan jelas bahwa ini akan saya perbaiki setelah requirement final."

**Q: "Pernah estimasi Anda meleset? Apa yang terjadi?"**

Never claim your estimates are always right — no one believes it. Show maturity instead:

> "Pernah, dan biasanya penyebabnya sama: ada hal yang tidak kelihatan di awal. Contohnya waktu di DBO, saya estimasi satu fitur integrasi 3 hari, ternyata dokumentasi API pihak ketiga tidak sesuai dengan perilaku aslinya, jadi banyak waktu habis untuk trial and error.
>
> Yang saya pelajari dan sekarang saya terapkan: kalau ada bagian yang bergantung ke sistem luar, saya cek dulu di awal — panggil satu endpoint sederhana untuk memastikan asumsinya benar — sebelum saya kunci estimasinya. Dan begitu saya sadar akan meleset, saya langsung bilang, tidak menunggu deadline lewat."

### B. Deadlines, delays, and bad news — the most important section

**Q: "Kalau Anda tahu tidak akan selesai tepat waktu, apa yang Anda lakukan?"**

This is *the* PM question. Memorize the shape of this answer.

> "Saya sampaikan secepat mungkin — begitu saya tahu, bukan menunggu sampai hari-H. Karena semakin cepat PM tahu, semakin banyak pilihan yang masih terbuka. Kalau baru tahu di hari terakhir, pilihannya tinggal satu: terlambat.
>
> Dan saya usahakan datang bukan cuma dengan masalah, tapi dengan opsi. Biasanya ada tiga arah:
> - **Kurangi scope** — fitur utamanya tetap rilis sesuai jadwal, bagian yang tidak kritis digeser ke rilis berikutnya.
> - **Tambah waktu** — kalau semuanya memang harus lengkap.
> - **Tambah bantuan** — meski saya sadar menambah orang di tengah proyek tidak selalu mempercepat, karena perlu waktu untuk menjelaskan konteksnya.
>
> Saya jelaskan konsekuensi tiap opsi, lalu keputusannya di PM — karena dia yang tahu prioritas bisnisnya. Tugas saya memastikan dia punya informasi yang cukup untuk memutuskan."

**Q: "Bagaimana Anda menangani blocker — misalnya menunggu tim lain?"**

> "Yang pertama, saya tidak diam menunggu. Saya kabari PM bahwa saya ke-block, siapa yang saya tunggu, dan sejak kapan — supaya kalau perlu eskalasi, PM bisa bantu dari sisinya.
>
> Kedua, saya cari yang masih bisa dikerjakan sambil menunggu. Misalnya kalau menunggu API dari tim lain, saya bisa siapkan dulu struktur kodenya dan pakai data tiruan, jadi begitu API-nya siap tinggal disambungkan.
>
> Yang saya hindari: ke-block tiga hari dan baru cerita di stand-up hari keempat."

**Q: "Ada bug kritis di production menjelang deadline fitur baru. Bagaimana Anda memilih?"**

Banking context makes this easy to answer well:

> "Production selalu didahulukan — apalagi di banking, karena yang terdampak nasabah dan uang. Fitur baru yang telat dampaknya internal; bug production yang dibiarkan dampaknya ke user dan reputasi.
>
> Yang saya lakukan: kabari PM segera bahwa saya harus pindah fokus dan ini pengaruhnya ke jadwal fitur. Lalu kalau bug-nya besar, prioritas pertama menghentikan dampaknya dulu — misalnya rollback atau matikan sementara fitur yang bermasalah — baru cari akar masalahnya. Jangan biarkan user terus terdampak sementara kita masih investigasi."

### C. Scope and changing requirements

**Q: "Bagaimana kalau requirement berubah di tengah pengerjaan?"**

> "Perubahan requirement itu normal, jadi saya tidak menganggapnya masalah. Yang penting dampaknya dibicarakan, bukan diam-diam diserap.
>
> Yang saya lakukan: pahami dulu kenapa berubah — kadang ada alasan bisnis yang valid dan justru bagus kita tahu sekarang daripada setelah rilis. Lalu saya sampaikan dampaknya secara konkret: 'Perubahan ini menambah sekitar 2 hari, jadi tanggal rilisnya bergeser, atau ada bagian lain yang perlu kita geser.'
>
> Yang saya hindari dua hal: menolak mentah-mentah karena merasa sudah terlanjur dikerjakan, dan menerima semua perubahan tanpa bilang dampaknya ke jadwal — karena itu yang akhirnya bikin proyek meleset diam-diam."

**Q: "Kalau Anda diminta mengerjakan sesuatu yang menurut Anda tidak perlu atau salah prioritas?"**

> "Saya tanya dulu konteksnya, karena sering kali ada alasan yang saya belum tahu — misalnya permintaan dari regulator, komitmen ke nasabah besar, atau ada dependensi ke tim lain.
>
> Kalau setelah tahu konteksnya saya masih melihat ada masalah, saya sampaikan dengan alasan konkret dan dampaknya — bukan sekadar 'menurut saya kurang bagus'. Tapi kalau keputusannya tetap jalan, saya kerjakan dengan baik. Yang tidak saya lakukan: diam waktu diskusi, lalu mengeluh belakangan."

### D. Explaining technical things to non-technical people

**Q: "Bagaimana Anda menjelaskan masalah teknis ke orang non-teknis?"**

The rule: **start with impact, not cause.**

> "Saya mulai dari dampaknya dulu, bukan penyebab teknisnya. Orang non-teknis butuh tahu: siapa yang terpengaruh, seberapa parah, dan kapan selesai. Detail teknisnya saya simpan, dan baru saya jelaskan kalau mereka memang mau tahu.
>
> Contohnya waktu ada insiden di DBO: kalau saya bilang 'ada race condition di webhook handler', tidak ada yang paham. Yang saya sampaikan: 'Ada beberapa toko yang menerima poin dua kali lipat dari seharusnya. Jumlahnya sekian toko, sudah kami hentikan penyebabnya, dan datanya sedang kami koreksi hari ini.' Itu bisa langsung dipakai untuk komunikasi ke client."

Then, if they push for more:
> "Kalau ditanya penyebabnya, saya pakai analogi. Misalnya: dua permintaan datang bersamaan, keduanya sama-sama mengecek 'sudah diproses belum?' sebelum salah satunya sempat mencatat, jadi keduanya merasa belum. Itu cukup untuk paham tanpa harus tahu istilah teknisnya."

**Q: "Bagaimana Anda memberi update progress?"**

> "Saya usahakan update-nya konkret, bukan persentase yang mengambang. 'Sudah 80%' itu sulit dipakai PM. Yang lebih berguna: bagian mana yang sudah selesai dan sudah bisa dites, bagian mana yang sedang dikerjakan, dan apakah ada yang menghambat.
>
> Dan kalau ada risiko, saya sampaikan di update — bukan menunggu ditanya."

### E. Collaboration — QA, analysts, designers, other developers

**Q: "Bagaimana Anda bekerja dengan QA, terutama kalau mereka menemukan banyak bug?"**

Never sound defensive here:

> "Buat saya QA menemukan bug itu tandanya QA bekerja dengan baik — lebih baik ketahuan di internal daripada di production, apalagi di aplikasi perbankan.
>
> Yang saya lakukan: minta langkah reproduksinya sejelas mungkin supaya tidak buang waktu menebak, lalu prioritaskan berdasarkan dampak ke user — bukan berdasarkan mana yang paling gampang diperbaiki. Dan untuk bug yang berulang jenisnya, saya tambahkan test supaya tidak balik lagi diam-diam.
>
> Yang saya hindari: berdebat soal 'ini bug atau bukan'. Kalau memang bukan bug, biasanya artinya requirement-nya yang belum jelas — dan itu perlu dibereskan juga, bukan diperdebatkan."

**Q: "Bagaimana kalau requirement dari Solution Analyst kurang jelas atau menurut Anda ada yang keliru?"**

> "Saya tanya langsung ke analyst-nya, secepat mungkin di awal — bukan setelah setengah fitur dikerjakan. Biasanya saya sampaikan dalam bentuk pertanyaan konkret, bukan koreksi: 'Untuk kasus kalau user-nya belum verifikasi, alurnya jadi bagaimana?' Sering kali itu memang belum terpikirkan, dan lebih murah dibereskan sekarang.
>
> Kalau saya melihat ada yang secara teknis bermasalah — misalnya bisa berat di performa — saya sampaikan dengan alternatifnya, bukan cuma bilang tidak bisa."

**Q: "Pernah ada konflik dengan rekan tim? Bagaimana Anda menyelesaikannya?"**

Pick a real, low-drama example — technical disagreement is safest:

> "Konflik besar tidak pernah, tapi perbedaan pendapat teknis sering. Cara saya: bicarakan langsung dengan orangnya, bukan lewat komentar panjang di code review — karena tulisan gampang terasa lebih keras dari maksudnya.
>
> Dan saya usahakan diskusinya soal tradeoff, bukan soal siapa yang benar. Misalnya: 'Kalau pakai cara ini lebih cepat sekarang, tapi nanti lebih sulit diubah. Kalau pakai cara itu sebaliknya. Untuk kasus kita sekarang, mana yang lebih penting?' Biasanya begitu diskusinya soal kebutuhan, bukan soal preferensi, cepat selesai."

### F. Process and tools

**Q: "Anda terbiasa dengan metodologi apa? Agile, Scrum?"**

Be concrete about what you actually did, not textbook Scrum:

> "Di tempat saya sekarang kami jalan dengan sprint, ada stand-up harian, task dikelola di board, dan setiap perubahan lewat code review sebelum masuk. Untuk rilis, kami punya siklus yang teratur, bukan rilis kapan saja.
>
> Waktu saya lead tim di DBO pada fase maintenance dan penambahan fitur, tugas saya termasuk memastikan pembagian task jelas, progress kelihatan, dan fitur yang direncanakan benar-benar rilis. Jadi saya terbiasa di dua sisi — sebagai yang mengerjakan dan sebagai yang memastikan timnya jalan."

**Q: "Bagaimana Anda mengatur prioritas kalau banyak task sekaligus?"**

> "Saya urutkan berdasarkan dampak dan ketergantungan. Pertama, apa pun yang memblokir orang lain saya dahulukan — karena kalau saya tunda, dua orang berhenti, bukan satu. Kedua, yang berdampak ke user atau ke production. Baru setelah itu yang lain.
>
> Kalau memang tidak semuanya muat, saya tidak diam-diam memilih sendiri — saya konfirmasi ke PM: 'Ini tiga hal yang ada, saya rasa urutannya begini, apakah sesuai dengan prioritas Anda?'"

### G. About your experience — the DBO lead story

**Q: "Ceritakan pengalaman Anda memimpin tim."**

This is your strongest card in the PM round. Structure it as delivery, not technology:

> "Di proyek DBO, awalnya saya masuk sebagai backend developer. Setelah aplikasinya rilis dan masuk fase maintenance plus penambahan fitur, saya yang memimpin timnya.
>
> Yang saya kerjakan di peran itu: memastikan pembagian task jelas, memastikan fitur yang direncanakan benar-benar rilis, dan membantu anggota tim yang mentok — biasanya lewat pair programming supaya kelihatan di mana sebenarnya kesulitannya.
>
> Sistemnya sekarang dipakai puluhan ribu user, dan yang saya anggap keberhasilan bukan cuma fiturnya jadi, tapi timnya bisa jalan tanpa saya harus mengecek satu per satu."

**Q: "Apa proyek paling menantang yang pernah Anda kerjakan, dari sisi koordinasi?"**

> "DBO, karena bentuknya bukan satu aplikasi. Ada aplikasi mobile untuk toko, CMS untuk admin, dan panel verifikasi — semuanya dilayani satu backend yang juga terhubung ke tiga sistem pihak ketiga untuk pembayaran poin, order, dan OTP.
>
> Tantangannya bukan di kode, tapi di koordinasi: perubahan di satu API bisa memengaruhi tiga frontend sekaligus, dan pihak ketiga punya jadwal sendiri yang tidak bisa kami atur. Jadi saya belajar untuk mengomunikasikan perubahan lebih awal dan memastikan perubahan API dibuat tidak merusak yang lama dulu, baru yang lama dihapus setelah semua pindah."

---

## 3. Two things to raise that almost no candidate mentions

These are your differentiators in this round. Use them when the conversation opens naturally — don't force both.

### 3.1 Mobile release constraints

DDL ships mobile apps (Kotlin/Swift). A PM planning mobile releases lives with this problem daily:

> "Satu hal yang biasanya berpengaruh besar ke perencanaan mobile: tidak semua perbaikan bisa langsung sampai ke user. Perubahan yang menyentuh aplikasi native harus lewat build baru dan review App Store atau Play Store, yang butuh waktu dan tidak sepenuhnya bisa kita kontrol.
>
> Jadi waktu merencanakan, saya biasa membedakan mana perubahan yang bisa cepat sampai ke user dan mana yang terikat siklus rilis toko aplikasi. Untuk perbaikan yang sifatnya urgent, itu sangat memengaruhi pilihan solusinya."

**Why it lands:** it shows you understand delivery constraints, not just development. That's literally the PM's job.

### 3.2 Why banking delivery is deliberately slower

> "Yang saya pahami, di perbankan kecepatan rilis bukan satu-satunya ukuran. Ada tahap yang tidak bisa dilewati — pengujian, keamanan, kepatuhan — dan itu ada alasannya, karena yang dipertaruhkan uang nasabah.
>
> Jadi ekspektasi saya masuk ke sini bukan 'rilis secepat mungkin', tapi 'rilis dengan pasti dan bisa di-rollback kalau bermasalah'. Buat saya itu justru menarik, karena di sistem yang menyentuh uang, benar itu lebih penting daripada cepat."

**Why it lands:** many candidates from startup backgrounds signal impatience with bank processes. Signaling the opposite immediately separates you.

---

## 4. Red flags — what not to say in this round

| Don't say | Why it hurts | Say instead |
|---|---|---|
| "Estimasi saya biasanya akurat." | Nobody believes it; sounds inexperienced. | Give your method and how you handle being wrong. |
| Diving into technical detail unprompted | The PM stops following, and wonders if you can talk to business people. | Impact first, detail only if asked. |
| "Itu bukan tugas saya." | Kills you instantly in a coordination role. | "Bukan bidang saya, tapi saya bisa bantu carikan orang yang tepat." |
| Blaming QA, analysts, or another team | Suggests you'll be friction. | Describe the fix and the process change. |
| "Saya lebih suka kerja sendiri." | DDL runs on analysts, architects, QA, and multiple squads. | Emphasize you're comfortable inside a defined process. |
| Silence when you're blocked | The behavior PMs fear most. | Raise it the same day, with what you're doing meanwhile. |
| Promising an unrealistic date to look good | Predictability beats optimism. | Give an honest range with the risky part named. |

---

## 5. Questions to ask the PM (pick 2–3)

Ask about **process and delivery** — not code. Asking a PM about architecture wastes your turn.

- "Bagaimana alur kerja dari requirement sampai rilis di tim ini — dari Solution Analyst, ke developer, sampai QA?"
- "Siklus rilisnya seperti apa? Apakah ada sprint tetap, atau mengikuti jadwal rilis channel?"
- "Menurut Bapak/Ibu, tantangan terbesar dalam delivery di divisi ini apa — koordinasi antar tim, kompleksitas sistemnya, atau proses approval?"
- "Dari tiga area yang disebutkan — Retail, Segment Internal, dan SME — kira-kira saya akan masuk ke yang mana?"
- **Closer:** "Setelah sesi ini, bagaimana proses dan timeline selanjutnya?"

> ✅ **"SMI" is almost certainly SME** (Small and Medium Enterprise) — one of Bank Mandiri's three official business segments alongside Wholesale and Retail. That makes the three project areas map cleanly onto the bank's segment structure. See [the SME section in the Team Lead note](bank-mandiri-ddl-round3-team-lead.md) — **this is the strongest fit story you have**, because your DBO platform did structurally the same thing.

---

## 6. Cheatsheet — read 10 minutes before this round

**The one sentence to carry through the whole interview:**
> Bad news early, with options attached.

**Estimation answer in four beats:**
1. Break it down → 2. Separate known from unknown → 3. Name the risky part → 4. Give confidence, not just a number.

**When you'll miss a deadline — three options to offer:**
Cut scope · Add time · Add help (and note that adding people late can slow things down).

**Explaining to non-technical people:**
Impact first → who's affected → when it's fixed → technical cause only if asked.

**Your strongest PM-round asset:**
The DBO lead story — you led a team through maintenance and feature delivery, on a system now used by tens of thousands of users.

**Two differentiators to drop in:**
Mobile app store release constraints · Banking delivery is deliberately careful, and you're fine with that.

**Never:**
Go silent when blocked · Blame QA · Dive into technical detail unprompted · Claim your estimates are always right.

---

## 7. Before the interview

1. Say the **"I'll miss the deadline"** answer out loud twice — this is the highest-probability question of the round.
2. Prepare the **DBO lead story** as a delivery story, not a technical one (team, coordination, shipping — not architecture).
3. Have **one real estimation miss** ready, with what you changed afterward.
4. Write your 3 questions on paper where you can see them.
5. Skim the red flags table one final time.

Want to rehearse this round live? Run `/mock-interview bank mandiri project manager`.

---

## Sources

- Candidate's own notes from Round 1 (Department Head, 2026-07-28) — interview structure and stack stated directly by the interviewer
- [Pertanyaan Interview Project Management + Contoh Jawaban — Glints](https://glints.com/id/lowongan/pertanyaan-interview-project-management/) — conflict, collaboration, scope questions
- [Pertanyaan Interview Kerja Software Project Management 2026 — MySkill](https://blog.myskill.id/istilah-dan-tutorial/pertanyaan-interview-kerja-software-project-management-dan-cara-menjawabnya/) — schedule and scope management
- [12 Pertanyaan Interview Project Manager — Dibimbing](https://dibimbing.id/blog/detail/pertanyaan-interview-project-manager-jawaban-tipsnya) — estimation and delivery questions
- [Template Pertanyaan Interview Project Manager — MyRobin](https://myrobin.id/en/pojok-hrd/template-pertanyaan-interview-project-manager/) — collaboration tooling and standups
- [Bank Mandiri Interview Experience & Questions — Glassdoor](https://www.glassdoor.com/Interview/Bank-Mandiri-Interview-Questions-E40419.htm) — process, difficulty, and focus areas
- Related workspace notes: [Round 3 — Team Lead](bank-mandiri-ddl-round3-team-lead.md), [DDL technical question bank](bank-mandiri-ddl-technical-user-interview-questions.md), [DBO case study](../dbo-b2b-platform-system-design-case-study.md)
