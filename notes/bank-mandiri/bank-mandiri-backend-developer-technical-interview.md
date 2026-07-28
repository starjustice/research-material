# Bank Mandiri — Backend Developer Technical Interview (Morning Of)

- **Written:** 2026-07-29
- **Interview:** Rabu, 29 Juli 2026, **07:30 WIB** — Google Meet
- **Role stated in the invitation:** **Backend Developer** ← this changes the preparation
- **Rounds done:** Department Head ✅ (simple introduction)
- **Other round notes:** [Round 2 — PM](bank-mandiri-ddl-round2-project-manager.md) · [Round 3 — Team Lead](bank-mandiri-ddl-round3-team-lead.md)

> ⏰ **This is a morning-of note.** Short, high-yield, ordered by what's most likely to come up. If you only have 20 minutes, read sections 1, 2, and 9.

## 1. Two things that changed — read this first

### 1.1 The role is Backend Developer, not web

Earlier prep said your best fit was the web/React side. **The invitation says Backend Developer.** That maps to the **DDL-01 Backend Developer** posting: **Java, Spring, microservices, RDBMS** — plus the stack the department head named: **Redis, RabbitMQ, Sentry, Elastic**.

**What this means honestly:** you are interviewing for a Java backend role without production Java. That's the central challenge of this interview, and pretending otherwise will fail. But your *backend thinking* is real and transferable — microservices, queues, idempotency, PostgreSQL, auth, third-party integration are all genuinely yours.

**Strategy: own the language gap early, then compete on backend judgment.**

### 1.2 "Join dengan laptop serta jaringan yang proper" is a signal

That line usually means **screen sharing** — and often live coding or a code walkthrough. Prepare for it:

- Have your **DBO or Unloan code open in an editor** before the call, ready to share.
- Close anything private: other tabs, chats, client names, `.env` files, credentials.
- Test screen share in Google Meet **before** 07:30.
- Have a scratch file open in case they ask you to write something.

---

## 2. The opening move — own the Java gap in the first minutes

Do not wait to be caught. Say it early, calmly, and follow immediately with what transfers.

> "Sebelum masuk lebih dalam, saya mau terbuka dari awal: pengalaman produksi backend saya di Node.js dan TypeScript, bukan Java. Yang saya bawa adalah pengalaman backend-nya — microservices, message queue, caching, idempotency untuk operasi uang, PostgreSQL, dan integrasi ke sistem pihak ketiga. Itu semua sudah saya kerjakan langsung di production.
>
> Dan saya sudah pernah membuktikan bisa pindah ekosistem: saya belajar .NET dan C# dari nol untuk satu technical assessment dan lolos tahap teknisnya. Java secara konsep dekat dengan itu — strongly typed, OOP, ekosistem enterprise. Jadi yang perlu saya kejar sintaks dan tooling-nya, bukan cara berpikir backend-nya."

**If asked "berapa lama sampai produktif?"**
> "Untuk mengerjakan task yang jelas dengan code review, saya perkirakan beberapa minggu. Untuk benar-benar nyaman dengan Spring dan konvensi timnya, realistisnya beberapa bulan. Saya lebih suka memberi angka jujur daripada menjanjikan langsung bisa."

**Do not** say "Java itu mudah" or "tinggal belajar seminggu." A backend interviewer will hear that as not respecting the ecosystem.

---

## 3. Java vocabulary — enough to follow the conversation

You cannot learn Java this morning, and you shouldn't try. But knowing the vocabulary means you can follow their questions and answer conceptually. **Skim this once.**

| Term | What it means (you already know the concept) |
|---|---|
| **JVM** | The runtime Java compiles to. Memory tuning and garbage collection pauses are real production concerns. |
| **Spring / Spring Boot** | The dominant framework. Handles HTTP endpoints, dependency injection, DB access. Comparable to how NestJS structures a Node app. |
| **Dependency injection** | Objects receive dependencies from outside instead of creating them. Makes testing easier. Same idea as constructor injection in Nest. |
| **`@RestController`** | Marks a class that handles HTTP requests. Like an Express router. |
| **`@Service`** | Business logic layer. |
| **`@Repository`** | Data access layer. Like a Prisma-backed repository. |
| **`@Autowired`** | Injects a dependency. |
| **JPA / Hibernate** | ORM — maps objects to database tables. Java's equivalent of Prisma. |
| **Interface vs abstract class** | Interface = contract only. Abstract class = contract plus shared implementation. |
| **Checked vs unchecked exception** | Checked must be declared or caught; unchecked (RuntimeException) need not be. A Java-specific distinction with no JS equivalent. |
| **`equals()` vs `==`** | `==` compares references; `equals()` compares values. Classic Java gotcha. |
| **Collections** | `List`/`ArrayList` (ordered), `Map`/`HashMap` (key-value), `Set` (unique). Same as Array, Map, Set. |

**If they ask a Java syntax question you don't know:**
> "Itu saya belum hafal sintaksnya di Java. Konsepnya saya paham — di TypeScript saya menanganinya begini [explain]. Kalau boleh, saya jelaskan konsepnya dan nanti sintaksnya saya sesuaikan."

That's an honest answer that still shows competence. It beats guessing.

---

## 4. Backend topics — where you compete and win

These are language-independent. This is your ground. **End every answer with a tradeoff.**

### 4.1 Idempotency and duplicates — your single strongest topic ⭐

**Lead with the mechanism in sentence one.** Your recorded weakness from the mock: you buried this behind vague framing for three follow-ups.

> "Prinsipnya idempotency — request yang sama diproses dua kali harus menghasilkan efek yang sama seperti sekali. Konkretnya tiga lapis: **idempotency key** berupa UUID yang disimpan server, **unique constraint di database** sebagai jaminan struktural, dan **duplicate detection di message broker**. Yang paling saya andalkan yang kedua, karena tidak bergantung pada kode aplikasi yang benar."

Then the **TADA story** when they ask for a real case:

> "Di platform B2B saya, dua webhook duplikat masuk hampir bersamaan. Keduanya mengecek 'sudah diproses belum?' sebelum salah satunya commit, jadi keduanya merasa belum — toko dapat poin dua kali lipat, harusnya 100 jadi 200.
>
> Saya telusuri lewat point history, ketemu dua event identik terpaut milidetik. Saya koreksi saldonya, lalu tambahkan row-level locking supaya pengecekan dan penulisan atomic. Dan saya sampaikan ke client secara terbuka.
>
> Pelajarannya: duplicate delivery itu bukan bug pengirim — itu memang kontraknya. Penerima yang harus idempotent."

### 4.2 Database — very likely for a backend role

**Transactions and ACID:**
> "ACID: Atomicity — semua berhasil atau semua batal. Consistency — data selalu memenuhi aturan yang ditetapkan. Isolation — transaksi yang jalan bersamaan tidak saling mengganggu. Durability — begitu commit, datanya bertahan meski server mati. Untuk operasi uang, atomicity paling krusial: debit dan kredit harus dalam satu transaksi, tidak boleh setengah jalan."

**Race condition / locking** — connect to TADA:
> "`SELECT ... FOR UPDATE` mengunci baris sampai transaksi selesai, jadi transaksi lain menunggu. Itu yang saya pakai untuk memperbaiki kasus poin ganda — supaya pengecekan dan penulisan tidak bisa disisipi transaksi lain."

**Indexing:**
> "Index itu jalan pintas pencarian. Saya pakai EXPLAIN dulu untuk lihat apakah query-nya sequential scan di tabel besar. Tapi index tidak gratis — setiap insert dan update harus ikut memperbarui index. Jadi di tabel yang sangat sering ditulis, menambah index ada biayanya."

**N+1:**
> "Ambil 100 order, lalu untuk tiap order query lagi satu-satu — jadi 101 query, bukan 1. Solusinya batching: kumpulkan ID-nya, ambil sekaligus dalam satu query."

**Zero-downtime migration:**
> "Expand-migrate-contract. Tambah kolom baru dulu, tulis ke keduanya sambil pindahkan data lama, setelah semua instance pakai yang baru baru kolom lama dihapus. Karena saat deploy ada momen versi lama dan baru jalan bersamaan."

**Be ready to write SQL.** Likely: a JOIN, a GROUP BY with aggregate, maybe a subquery. Practice mentally: "tampilkan 10 nasabah dengan total transaksi terbesar bulan ini."

### 4.3 Redis / caching

> "Saya cache data yang sering dibaca, jarang berubah, dan boleh sedikit basi — konfigurasi, daftar produk, kurs. Yang tidak saya cache: saldo setelah transaksi, karena kalau user baru transfer lalu lihat saldo lama itu masalah kepercayaan.
>
> Kalau harus di-cache tapi juga harus akurat, saya invalidate begitu transaksi commit, bukan mengandalkan TTL. Dan cache tidak boleh jadi sumber kebenaran — kalau Redis mati sistem harus tetap jalan, meski lebih lambat."

Other Redis uses worth naming: **session storage**, **rate limiting** (OTP endpoints), **distributed lock**.

### 4.4 RabbitMQ / message queue — your bridge

> "Di Unloan saya pakai Azure Service Bus — fungsinya sama seperti RabbitMQ. Producer, queue, consumer, retry, dead-letter queue. Yang berbeda cuma nama produknya."

Vocabulary: **ack/nack**, **DLQ** (where a message goes after repeated failure so it stops blocking the queue), **at-least-once delivery** (messages may arrive twice → consumer must be idempotent), **queue depth monitoring**.

**When queue vs synchronous:**
> "Synchronous kalau user menunggu jawabannya sekarang — cek saldo, login. Queue kalau boleh selesai beberapa saat kemudian, atau kalau saya butuh sistem tetap jalan meski service tujuan mati. Tapi queue menambah kompleksitas — pesan ganda, urutan, monitoring — jadi tidak saya pakai tanpa alasan jelas."

### 4.5 API design

- **REST basics:** GET (read, safe), POST (create), PUT (replace), PATCH (partial), DELETE. Status codes: 200, 201, 400, 401, 403, 404, 409 (conflict), 422, 500.
- **REST vs GraphQL tradeoff** — you have real experience here, use it:
> "GraphQL bagus waktu banyak client dengan kebutuhan data berbeda — mobile butuh sedikit field, web butuh banyak, tanpa bikin endpoint baru. Biayanya: caching lebih rumit, dan N+1 gampang muncul kalau tidak pakai batching. Untuk API internal yang stabil dan sederhana, REST sering lebih mudah dioperasikan."
- **Versioning:** never break existing clients — especially mobile, where old app versions stay installed for months.

### 4.6 Auth and security

- **Authentication vs authorization** — who you are vs what you may do. Many breaches come from valid auth but missing authorization checks (changing an ID in the request to read someone else's data).
- **Password hashing, never encryption** — one-way, bcrypt or Argon2. Saying "encrypt the password" is a red flag in a bank.
- **JWT vs session** — JWT is stateless and scales well, but **revocation is the problem**: it stays valid until expiry unless you keep a denylist, which reintroduces state. Sessions are easy to revoke but need shared storage (Redis).
- **Rate limiting on OTP** — fraud and cost (each SMS costs money).
- **Never log PII in plain text** — your real Unloan practice: debug via loan ID or user ID.

### 4.7 Microservices vs monolith

Show judgment, not fashion:
> "Saya pisahkan service berdasarkan kebutuhan operasional, bukan karena ingin microservices. Di DBO, service integrasi pihak ketiga saya pisah karena kegagalannya tidak boleh menjatuhkan API utama, dan pola bebannya berbeda — banyak menunggu jaringan.
>
> Kalau ditanya apa yang saya ubah: sebagian pemisahan sebenarnya belum perlu di awal. Untuk skala kami saat itu, monolith yang tertata rapi lebih mudah dioperasikan. Memisahkan terlalu awal menambah biaya operasional tanpa manfaat sepadan."

Admitting the over-split is a **senior signal**.

### 4.8 Production debugging

> "Kumpulkan bukti dulu — log, error report, berapa user terdampak, sejak kapan. 'Sejak kapan' penting karena mengarah ke release tertentu. Lalu cari apa yang beda antara production dan lokal: volume data, respons pihak ketiga yang asli, concurrency, konfigurasi. Buat satu hipotesis, uji itu dulu — jangan ubah banyak hal sekaligus. Setelah ketemu, perbaiki dan tambahkan test.
>
> Kalau dampaknya besar, saya mitigasi dulu — rollback atau matikan fiturnya — baru investigasi. Jangan biarkan user terus terdampak sementara kita mencari."

---

## 5. If there's live coding

Likely light, given the role and the 07:30 slot. If it happens:

- **Think out loud.** Silence reads as being stuck. Narrate: "saya asumsikan input-nya selalu valid, boleh?"
- **Ask clarifying questions first** — input size, edge cases, error handling expectations.
- **Write it in the language you know** if allowed: *"Boleh saya tulis di TypeScript? Logikanya sama, saya belum fasih sintaks Java."* Most interviewers say yes, and asking is better than writing broken Java.
- **Start simple, then improve.** A working simple solution beats an unfinished clever one.
- Common asks: string/array manipulation, a simple API endpoint design, or SQL.

---

## 6. Your walkthrough projects — have these ready

**DBO (strongest for backend):** B2B platform, material stores ordering from brands. Backend architecture, three frontends, three third-party integrations (payment/points, orders, OTP), the TADA incident, tens of thousands of users, and you led the team in the maintenance phase.

**Unloan (strongest for banking credibility):** home loan application under CBA Australia. Regulated environment, PII handling with dummy data in dev, event-driven with Azure Service Bus, three-layer duplicate protection (Service Bus dedup, DB unique constraint, idempotency key to external APIs).

**Say this about Unloan if fit comes up:**
> "Di Unloan saya sudah bekerja di lingkungan bank — CBA Australia — jadi saya terbiasa dengan tuntutan data sensitif dan proses yang lebih ketat. Itu yang membuat saya nyaman masuk ke lingkungan perbankan."

---

## 7. Questions to ask them (pick 2–3)

- "Untuk role backend ini, saya akan masuk ke area yang mana — Retail, Segment Internal, atau SME?"
- ⭐ "Untuk engineer yang datang dari background Node/TypeScript, biasanya onboarding ke ekosistem Java di tim ini seperti apa? Apakah ada masa belajar terstruktur?" — acknowledges the gap and shows you're planning to close it.
- "Servicenya lebih banyak greenfield atau maintain sistem yang sudah jalan?"
- "Bagaimana proses code review dan deployment di tim — berapa sering rilis ke production?"
- **Closer:** "Setelah sesi ini, prosesnya bagaimana?"

---

## 8. Red flags — do not say these

| Don't | Instead |
|---|---|
| "Java gampang, seminggu juga bisa" | Give an honest ramp-up estimate |
| "Encrypt the password" | **Hashing** — one-way, bcrypt/Argon2 |
| "Event-driven architecture" as a reliability answer | Name the mechanism: idempotency key, unique constraint, dedup |
| Bluffing a Java syntax answer | "Konsepnya saya paham, sintaksnya belum hafal" |
| Describing only *what* you built | End with the tradeoff |
| Claiming the architecture was perfect | Name one thing you'd do differently |
| Hiding the Java gap until asked | Own it in the first few minutes |

---

## 9. Morning checklist — 07:00

1. **Test Google Meet**: camera, mic, and **screen share** — the invitation specifically asked for a proper laptop and network.
2. **Close private things**: other tabs, chat apps, `.env` files, client-confidential code.
3. **Open your code**: DBO or Unloan, ready to share. Plus a blank scratch file.
4. Say the **Java gap answer** out loud once.
5. Say the **idempotency answer** out loud once — mechanism in the first sentence.
6. Skim section 3 (Java vocabulary) one time.
7. Have your questions visible on paper or a second screen.
8. Water, quiet room, plain background. Join 5 minutes early.

**Mindset:** they invited you for a backend role knowing your CV. The Java gap is real but it isn't disqualifying — what they're testing is whether you think like a backend engineer. You do. Be honest about the language, and let the systems thinking carry the interview.

---

## Sources

- Interview invitation received from Bank Mandiri recruiter (Rabu, 29 Juli 2026, 07:30, Google Meet) — role stated as Backend Developer
- Stack details stated by the Department Head in Round 1 (Java, Redis, RabbitMQ, Sentry, Elastic; Kotlin/Swift mobile; Angular/React web)
- [DDL - 01 - Backend Developer (Java/Microservices) — Kalibrr](https://www.kalibrr.com/c/pt-bank-mandiri-persero-tbk/jobs/108264/ddl-01-backend-developer-java-microservices) — Spring, JMS, RDBMS requirements
- Related workspace notes: [Team Lead round](bank-mandiri-ddl-round3-team-lead.md) (deeper stack detail), [technical question bank](bank-mandiri-ddl-technical-user-interview-questions.md), [DBO case study](../dbo-b2b-platform-system-design-case-study.md)
