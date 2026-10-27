# 25. An index, built and searched

> **Subject:** Database · **Lesson:** 25 · **Made:** 2026-10-27 · **Status:** ready
>
> **You will be able to:** draw a B-tree index from the table up (page, leaf, tree), say how it is built, walk one lookup page by page, and explain why a lookup reads 4 pages and not 10,301.
>
> **Before this:** [Indexes and B-trees](09-indexes-and-b-trees.md) is the gentle start. [One query, from start to finish](24-one-query-start-to-finish.md) gives the map. · **Next:** [What an index costs, and when Postgres ignores it](26-what-an-index-costs.md)
>
> **How to read it:** one card is one idea. Look at the picture, guess, then press the orange bar to check. The blue bars (📖 More detail) hold the longer explanation with the why and a real example. Skip them on the first read, and open them when you want more. Every number was run on PostgreSQL 17.5 (the newest release is 18). About 25 minutes for the cards.

## 1. The idea: a card catalog

A big library has a card catalog. You never walk every shelf. You open a drawer, then a part of the drawer, then find the card. The card says: **shelf 3, slot 7**.

```mermaid
graph TB
    A["🗂️ Root: which drawer?"] --> B["📂 Middle: which part?"]
    B --> C["🔖 Leaf: the card for the key"]
    C -->|"address: page, slot"| D["📚 Table: the real row"]
```

That is an index. We will use a table `l25_big` with 1 million rows (80 MB, 10,301 pages of 8 KB) and an index on its `id`.

Notice: the index is a second thing, next to the table. It holds the keys in order, and an address for each row.

<details class="guess"><summary>🤔 Guess: find the row with id = 777777. How many 8 KB pages does Postgres read: 4, 400, or 10,301? Press to check.</summary>

**4.** Three index pages (root, middle, leaf) and one table page. `EXPLAIN (ANALYZE, BUFFERS)` says `Buffers: shared hit=4`.

Card 5 shows what happens with no index.

</details>

> **Remember:** an index is a second, sorted copy of one column, with the address of each row.

The catalog is only an analogy. A person sorts the cards once. Postgres must keep the index sorted on every write, and that costs (lesson 26).

<details class="more"><summary>📖 More detail: why a B-tree, and not a simpler tree</summary>

- **A binary tree** has 2 children per node. For 1 million keys that is about 20 levels (2 to the power of 20 is about 1 million). If every node is a different page, one lookup reads 20 pages. A B-tree node is a whole 8 KB page with hundreds of keys, so 1 million keys need only 3 levels.
- **A hash table** finds one key fast, but it knows nothing about order. It cannot do `<`, `BETWEEN` or `ORDER BY`. A B-tree keeps the keys sorted, so it handles `=`, `<`, `>`, `BETWEEN`, `IS NULL` and sorted output. The docs list these.
- **The page is the unit.** The disk, the memory cache and the log all work in 8 KB pages. A tree whose nodes are pages fits the whole machine.

The Postgres B-tree follows a paper by Lehman and Yao (1981). It is a design for many sessions reading and writing the same tree at the same time. The source README says so.

</details>

## 2. First, the table: pages and addresses

A table is a pile of **pages**, 8 KB each. A row lives in one page, in one **slot**. Its address is `(page, slot)`. Postgres calls it the `ctid`.

A tiny table, `l25_people`. All 6 rows fit in page 0.

| ctid | id | name | city |
|---|---|---|---|
| (0,1) | 1 | Ayu | Medan |
| (0,2) | 2 | Budi | Bali |
| (0,3) | 3 | Citra | Medan |
| (0,4) | 4 | Dewi | Jakarta |
| (0,5) | 5 | Eko | Bali |
| (0,6) | 6 | Fajar | Medan |

```sql
SELECT ctid, id, name
FROM l25_people
WHERE city = 'Medan';
```

<details class="guess"><summary>🤔 Guess: which three addresses come back? Press to check.</summary>

```
 ctid  | id | name
-------+----+--------
 (0,1) |  1 | Ayu
 (0,3) |  3 | Citra
 (0,6) |  6 | Fajar
```

With no index, Postgres reads page 0 and looks at every slot. Fine for 6 rows. For 10,301 pages it would read every one.

</details>

> **Remember:** a row's address is (page, slot). Postgres always reads whole pages.

<details class="more"><summary>📖 More detail: inside one 8 KB page</summary>

| Part | Size |
|---|---|
| Header | 24 bytes |
| Line pointers | 4 bytes each |
| Free space | the middle |
| Rows | the rest |

The line pointers grow forward from the header. The rows grow backward from the end of the page. The free space is what is left between them.

Real numbers from the tiny table. `page_header` says `lower = 48`: 24 bytes of header plus 6 line pointers of 4 bytes. It says `upper = 7944`: the place where the rows start. The 6 rows take 37 to 41 bytes each: a 24-byte header (23 bytes and 1 byte of padding) and the data.

The slot in an address `(page, slot)` is the number of a **line pointer**. It is not a byte position. The line pointer says where the row is inside the page. So Postgres can move rows inside the page to join the free space, and the address does not change. The docs say a line pointer is never moved until it is freed.

A table page has no special area (`special = 8192`, the same as the page size). An index page does: 16 bytes at the end, with the links to its left and right neighbor pages (`special = 8176`).

You can look at a page yourself with `pageinspect` (test database only):

```sql
SELECT lower, upper, special
FROM page_header(
  get_raw_page(
    'l25_people', 0));
```

</details>

## 3. The leaf: sorted keys with addresses

The primary key made an index on `id`. We can look at its only leaf page with the `pageinspect` tool.

```sql
SELECT itemoffset,
       ctid AS points_to
FROM bt_page_items(
       'l25_people_pkey', 1)
ORDER BY itemoffset;
```

| key (id) | points to |
|---|---|
| 1 | (0,1) |
| 2 | (0,2) |
| 3 | (0,3) |
| 4 | (0,4) |
| 5 | (0,5) |
| 6 | (0,6) |

<details class="guess"><summary>🤔 Guess: for id = 3, what does the index store: the whole row, or only the key and an address? Press to check.</summary>

Only the **key and the address** `(0,3)`. The row itself stays in the table.

The items are in sorted order. That is the whole trick. A sorted list can be searched by halving it, so you do not read every item.

</details>

> **Remember:** a leaf item is a key plus the address of its row. Items are sorted.

<details class="more"><summary>📖 More detail: one leaf item, and the high key</summary>

One leaf item of an integer index is 16 bytes: 8 bytes for the row address and flags, and 8 bytes for the key (a 4-byte integer, padded). Add a 4-byte line pointer and an entry is 20 bytes. So a page holds about 400 entries. In the split test, 407 fit.

`bt_page_items` also shows the size of each item:

```sql
SELECT itemoffset, ctid,
       itemlen
FROM bt_page_items(
  'l25_people_pkey', 1)
LIMIT 3;
```

| itemoffset | ctid | itemlen |
|---|---|---|
| 1 | (0,1) | 16 |
| 2 | (0,2) | 16 |
| 3 | (0,3) | 16 |

Two rows can have the same key. Postgres adds the row address as the last part of the key, so every entry is unique and sorted. The source README says it uses the heap TID as a tiebreaker.

A page that has a right neighbor starts with a **high key**: the upper limit of the keys that may live on that page. If a search arrives and its key is bigger than the high key, it moves right. This helps when a page was split a moment ago. In the split test of lesson 26, the left leaf had 367 items: the high key, and the keys 1 to 366.

</details>

## 4. Many leaves become a tree

A leaf page holds about 400 integer keys. One million keys need **2,733 leaf pages**. How do you know which leaf to open? Add pages above that say "keys 1 to 3,000 are on these leaves". Then add one more page above those.

```mermaid
graph TB
    R["🗂️ 1 root page: 10 entries"] --> M["📂 10 middle pages"]
    M --> L["🔖 2,733 leaf pages"]
    L --> T["📚 10,301 table pages"]
```

That is the **B-tree**: a root, middle pages, and leaves. The index is 2,745 pages (21 MB), against 10,301 for the table (80 MB).

```sql
SELECT level
FROM bt_metap('l25_big_pkey');
```

<details class="guess"><summary>🤔 Guess: how many levels does this tree have: 3, 10 or 20? Press to check.</summary>

**3.** Root, middle, leaf. (`bt_metap` says `level = 2`, because it counts up from the leaves, which are level 0.)

Each page holds a few hundred entries. So each new level multiplies the room by a few hundred. Three levels hold tens of millions of rows. The tree stays short and wide.

</details>

> **Remember:** short and wide. 1 million rows is only 3 levels.

<details class="more"><summary>📖 More detail: the root page, with real keys</summary>

This is the root page of the 1 million row index, read with `pageinspect`:

```sql
SELECT itemoffset,
       ctid AS child_page,
       data
FROM bt_page_items(
  'l25_big_pkey',
  (SELECT root
   FROM bt_metap(
     'l25_big_pkey')));
```

| Entry | Child | Smallest key |
|---|---|---|
| 1 | 3 | none |
| 2 | 411 | 104,311 |
| 3 | 698 | 208,621 |
| 4 | 984 | 312,931 |

The root has 10 entries. Each one names a child page and the smallest key that can be in that child. Entry 1 has no key: it holds everything below entry 2. The keys are about 104,000 apart. So key 777777 belongs to about the 8th entry.

Each child is a middle page with about 270 entries, one for each leaf.

How full are the pages? I measured the whole index. Leaf pages were 9.9% empty (the default fillfactor is 90). Middle pages were 32.6% empty.

How deep for a bigger table? With about 270 children per middle page, 100 million rows would need about 270,000 leaves and about 1,000 middle pages. That is too many for one root page, so there would be one more level: about 4 levels. This is an estimate from the arithmetic. I did not build that table.

</details>

## 5. A lookup: walk down, then one jump

For id = 777777, Postgres opens the root, picks a middle page, picks a leaf, finds the key, and reads its address. Then it opens that one table page.

```mermaid
graph TB
    A["🗂️ page 1: root"] --> B["📂 page 2: middle"]
    B --> C["🔖 page 3: leaf"]
    C --> D["📚 page 4: the table row"]
```

```text
Index Scan using l25_big_pkey
  Index Cond: (id = 777777)
  Buffers: shared hit=4
```

Now the same table, but look for an email. There is no index on `email` yet.

```sql
SELECT * FROM l25_big
WHERE email =
  'user777777@example.com';
```

<details class="guess"><summary>🤔 Guess: how many pages does this one read? Press to check.</summary>

All of them: **10,301.**

```text
Seq Scan on l25_big
  Filter: (email = ...)
  Rows Removed by Filter: 999999
  Buffers: shared hit=10301
```

It read 1 million rows to keep 1. That is 4 pages against 10,301.

Two more things come free with a sorted leaf chain. The leaf pages are linked left to right, so `id BETWEEN 1000 AND 2000` finds 1000 and walks right. And `ORDER BY id LIMIT 3` needs no Sort box: it reads the first 3 entries.

</details>

> **Remember:** with an index, about 4 pages. Without one, every page.

<details class="more"><summary>📖 More detail: inside a page, and what stays in memory</summary>

Inside one page the items are sorted. So Postgres does a **binary search**: look at the middle item, then the middle of the half that is left, and so on. For 367 items that is about 9 comparisons. Over the 3 index pages it is about 20 comparisons in all, the same as a binary tree. But it touches only 4 pages.

The root and the middle pages are used by every lookup. So they almost always sit in shared buffers. Usually only the leaf page and the table page can be missing from memory. In my test, the first email lookup right after the index was built said `shared hit=3 read=1`. The second said `shared hit=4`.

After the leaf gives an address, Postgres opens that table page, goes to the line pointer, reads the row, and checks that the row is visible to you (xmin and xmax, lesson 24, card 9). That check is why card 6 needs the visibility map.

EXPLAIN shows three kinds of index scan:

- **Index Scan:** one address at a time. Each one jumps to the table.
- **Bitmap scan:** collect all the addresses, sort them by table page, then read each table page once, in order. Good when many rows match.
- **Index Only Scan:** no table visit (card 6).

</details>

## 6. Index-only scan: skip the table

Sometimes the answer is already in the leaf. `SELECT id ... WHERE id BETWEEN 1000 AND 2000` only needs ids, and the leaf has them. So why visit the table?

One catch. The index does not know if a row is visible to you (other transactions may have changed it). So Postgres keeps a **visibility map**: one bit per table page, "every row here is visible to everyone". If the bit is set, skip the table. **VACUUM** sets the bits.

| Mark | Postgres |
|---|---|
| ✅ set | index only |
| ❌ not set | visits the table |

I loaded the table and ran that query. The plan says `Index Only Scan`.

<details class="guess"><summary>🤔 Guess: the plan also says <code>Heap Fetches: 1001</code>. Why did it go to the table 1,001 times? Press to check.</summary>

The table was just loaded. No page was marked all-visible yet, so for each of the 1,001 rows Postgres had to check the table.

Then I ran `VACUUM l25_big;` and asked again:

```text
Index Only Scan
  Heap Fetches: 0
  Buffers: shared hit=7
```

(Shortened.) 0 table visits, and 7 pages instead of 16. If you ask for a column that is not in the index (like `note`), it is a normal Index Scan again, with 16 pages.

</details>

> **Remember:** an index-only scan needs two things: every column in the index, and VACUUMed pages.

<details class="more"><summary>📖 More detail: the visibility map, and a covering index</summary>

The visibility map keeps **two bits for each table page**: *all-visible* (every row is visible to everyone) and *all-frozen*. Only VACUUM sets them. Any change to the page clears them. The docs say both.

Real counts on `l25_big` (10,301 pages):

| When | Marked pages |
|---|---|
| loaded | 0 |
| VACUUM | 10,301 |
| 1 UPDATE | 10,299 |

These are the all-visible marks: after loading, after VACUUM, and after an UPDATE of one row. The one-row UPDATE cleared the mark on two pages: the page of the old row and the page of the new row. (All-frozen was 0 after VACUUM, because the rows were too new to freeze.)

Autovacuum also runs on tables that only get inserts, after 1,000 inserts by default (`autovacuum_vacuum_insert_threshold`). So the marks do get set.

**Covering index.** `SELECT id, note` cannot use the primary key index, because `note` is not in it. Add it as an extra column:

```sql
CREATE INDEX l25_big_id_note
  ON l25_big (id)
  INCLUDE (note);
```

After VACUUM, the query `SELECT id, note ... WHERE id BETWEEN 1000 AND 2000` was an Index Only Scan with `Heap Fetches: 0`. The price: this index is 39 MB, against 21 MB for the plain primary key index. Lesson 10 has more on covering indexes.

</details>

## 7. Building the index

`CREATE INDEX` reads the whole table once, sorts the keys, writes the leaf pages left to right, then writes the pages above them.

```mermaid
graph TB
    A["📖 read every row once"] --> B["🔤 sort the keys"]
    B --> C["🍃 write the leaf pages"]
    C --> D["🌳 write the pages above"]
```

An index on `email` for the 1 million rows took **39 MB**. The table is 80 MB. An index is never free.

A plain `CREATE INDEX` locks the table against writes until it ends. Reads still work. `CREATE INDEX CONCURRENTLY` does not block writes. It scans the table twice and waits for old transactions, so it is slower. It cannot run inside a transaction block.

<details class="guess"><summary>🤔 Guess: you add an index to a busy production table with a plain CREATE INDEX. What do your users feel? Press to check.</summary>

Reads work. Every **INSERT, UPDATE and DELETE waits** until the build ends. On a big table that can be minutes, and orders hang.

Next time:

```sql
CREATE INDEX CONCURRENTLY
  l25_big_email
  ON l25_big (email);
```

If a concurrent build fails, it leaves an **INVALID** index. It is ignored by queries, but it still slows every write. Look for it:

```sql
SELECT indexrelid::regclass
FROM pg_index
WHERE NOT indisvalid;
```

Drop it and try again.

</details>

> **Remember:** on a live table, use CREATE INDEX CONCURRENTLY. Then check for INVALID.

<details class="more"><summary>📖 More detail: why building is faster than inserting</summary>

`CREATE INDEX` sorts all the keys first. Then it writes full leaf pages one after the other, and then the pages above them. No page ever has to split. Inserting one key at a time into an existing index lands on random leaves and causes many splits (lesson 26).

My test: 1 million rows with random-looking keys.

- Index first, then load the rows: 4.2 seconds, index 27 MB.
- Load first, then `CREATE INDEX`: 1.9 seconds (0.5 seconds of it for the index), index 21 MB.

The times come from my test machine and will differ on yours. The size is the steadier part. So for a big first load, create the indexes after loading.

The sort uses `maintenance_work_mem` (64 MB by default). More memory makes a big build faster. Postgres can also use parallel workers for a B-tree build. I turned them off in my tests.

Pages are not filled to the brim. A B-tree index is built with a `fillfactor` of 90 by default. In the 1 million row index, leaf pages were 9.9% empty. That room is for new keys.

How `CONCURRENTLY` works, from the docs:

1. The index is added to the catalog as "invalid".
2. A first scan of the table builds it, after waiting for transactions that changed the table.
3. A second scan adds the rows that changed in the meantime.
4. Postgres waits for transactions that hold old snapshots.
5. The index is marked "valid".

</details>

## 8. Watch it run, step by step

Now watch a lookup walk the tree. **[Open the index lookup stepper](visuals/25-an-index-built-and-searched.html).** You press Next, and a key goes from the root down to the table row. Guess the next page first.

<details><summary>Or read the steps as a table</summary>

The lookup `WHERE id = 777777` on 1 million rows:

| Step | Page | What happens |
|---|---|---|
| 1 | root | which of the 10 middle pages? Page 2 |
| 2 | middle | which of its leaves? Leaf 3 |
| 3 | leaf | finds key 777777 and its address (page, slot) |
| 4 | table | reads that one table page and returns the row |

Total: 4 pages. Without the index: 10,301.

</details>

## 9. Why it matters and what it costs

Interview words: *B-tree (B+tree)*, *leaf page*, *TID*, *index scan*, *index-only scan*, *visibility map*.

- **With it,** a lookup reads about 4 pages on a million rows. The number grows very slowly as the table grows.
- **Without it,** every query on that column reads the whole table.

**The costs:**

- **Space:** the email index is 39 MB next to an 80 MB table.
- **Build time:** the table is read once, and sorted.
- **Maintenance:** VACUUM must run for index-only scans to work.
- **Writes:** every INSERT and UPDATE must keep the tree sorted. That is lesson 26.

## 10. Watch and play

Links checked on 2026-10-27. Each page was opened. For each video, the title and channel were confirmed through YouTube's oEmbed data. The video lengths were not checked.

- **Play with it:** [The index lookup stepper](visuals/25-an-index-built-and-searched.html) in this folder. Guess first, then press Next.
- **Play with it:** [B+ tree visualization](https://www.cs.usfca.edu/~galles/visualization/BPlusTree.html) by David Galles. Insert numbers and watch pages split. Insert 1 to 10 in order, then try a random order.
- **Video:** [The critical data structure for databases (B-trees)](https://www.youtube.com/watch?v=5jC2nebEvas) by Ben Dicken. How B-trees work and why databases use them. Watch it after card 4.
- **Video:** [Lesson #6 - Index Types (B-Tree), Deep Dive Into PostgreSQL Indexes](https://www.youtube.com/watch?v=AIOxQ3aXiWk) from Percona. A longer course lesson on Postgres B-trees.
- **Read:** [Anatomy of an SQL Index](https://use-the-index-luke.com/sql/anatomy) by Markus Winand. Pictures of the leaf chain and the tree. Read the next page, "The Balanced Search Tree", too.
- **Read:** [B-Tree Indexes](https://www.postgresql.org/docs/current/btree.html) in the PostgreSQL docs. Page types, the linked leaves, and deduplication.
- **Read:** [Index-Only Scans and Covering Indexes](https://www.postgresql.org/docs/current/indexes-index-only-scans.html). The official version of card 6.

<details><summary>More links (optional)</summary>

- **Read:** [CREATE INDEX](https://www.postgresql.org/docs/current/sql-createindex.html). The exact rules for CONCURRENTLY, in the section with that name.
- **Read:** [pageinspect](https://www.postgresql.org/docs/current/pageinspect.html). The tool used in cards 3 and 4.
- **Read (revision, dense):** [How Postgres works inside](postgres-internals-visual.md), Part 2 "The B-tree Index, Physically".

</details>

## 11. Practice

**A. Predict.** Before you run it: `SELECT id FROM l25_big ORDER BY id LIMIT 3;`. Does the plan have a Sort box?

<details class="guess"><summary>🤔 Press to see the answer</summary>

```text
Limit
  -> Index Only Scan
```

(Shortened.) No Sort. The leaf is already in order, so Postgres reads the first 3 entries and stops.

</details>

**B. What went wrong?** A teammate says: "Last night I added an index on `email` with a plain `CREATE INDEX` on the live table. At the same time, users said orders hung for 4 minutes." Explain, and say what to do next time.

<details class="guess"><summary>🤔 Press to see the answer</summary>

A plain CREATE INDEX blocks every write to the table until the build ends (card 7). Orders are inserts, so they waited.

Next time use `CREATE INDEX CONCURRENTLY`. It is slower, but writes keep working. Afterwards, check `pg_index` for `NOT indisvalid`.

</details>

**C. Write it yourself**

Open [`practice/25-an-index-built-and-searched.sql`](practice/25-an-index-built-and-searched.sql). It makes the tiny table and the 1 million row table, and gives six tasks with the exact expected results: the addresses, the leaf items, the tree depth, the page count of two lookups, the index-only scan before and after VACUUM, and the index build. Run the file once in psql, then write each query under its TODO.

<details><summary>One possible answer</summary>

```sql
-- Task 1
SELECT ctid, id, name FROM l25_people
ORDER BY id;

-- Task 2
SELECT itemoffset, ctid AS points_to
FROM bt_page_items('l25_people_pkey', 1)
ORDER BY itemoffset;

-- Task 3
SELECT level FROM bt_metap('l25_big_pkey');
SELECT relname, relpages FROM pg_class
WHERE relname IN ('l25_big','l25_big_pkey')
ORDER BY relname;

-- Task 4
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF,
         TIMING OFF, SUMMARY OFF)
SELECT * FROM l25_big WHERE id = 777777;
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF,
         TIMING OFF, SUMMARY OFF)
SELECT * FROM l25_big
WHERE email = 'user777777@example.com';

-- Task 5
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF,
         TIMING OFF, SUMMARY OFF)
SELECT id FROM l25_big
WHERE id BETWEEN 1000 AND 2000;
VACUUM l25_big;
-- run the same EXPLAIN again

-- Task 6
CREATE INDEX CONCURRENTLY l25_big_email
  ON l25_big (email);
SELECT pg_size_pretty(
  pg_relation_size('l25_big_email'));
SELECT indexrelid::regclass
FROM pg_index WHERE NOT indisvalid;
```

</details>

## 12. Interview question

**Q:** "How does a B-tree index find a row? Why is it fast on a table with a million rows? What does it cost?"

<details><summary>A strong answer, in four parts</summary>

1. **Problem:** without an index, Postgres must read every page of the table to find one row. On a million rows that is thousands of pages for one answer.
2. **How it works:** the index is a tree of 8 KB pages. The leaf pages hold the keys in sorted order, each with the address (page, slot) of its row, and the leaves are linked left to right. Pages above the leaves say which leaf to open. Each page holds hundreds of entries, so the tree is short: 3 levels for a million rows. A lookup reads the root, a middle page, a leaf, and then one table page: about 4 pages. A range or an ORDER BY walks along the leaves. If the query needs only indexed columns, and VACUUM has marked the table pages all-visible, an index-only scan skips the table.
3. **Tradeoff:** the index takes space (39 MB for an 80 MB table in my test) and must be kept sorted on every write, so it slows INSERT and UPDATE. On a live table you build it with CONCURRENTLY, which is slower but does not block writes, and you check for an INVALID index afterwards.
4. **My example:** *This is an idea, not a fact. Replace it with a real story from DBO, Unloan, ZWS or Skyworx.* A screen looks up an order by a customer email. Without an index the query reads the whole `orders` table. I add an index on `email` with CONCURRENTLY, and check with `EXPLAIN (ANALYZE, BUFFERS)` that the pages dropped from thousands to about 4.

</details>

## 13. Explain it back

Close this file. Press the **Record my explanation** button under this heading and explain how a B-tree index finds a row, like to a new junior, in 4 parts: problem, how it works, tradeoff, my example. Use the numbers: 3 levels, about 4 pages, against every page. Then save the transcript into `my-learning/recordings/`, or write your best version below. Run `/explain-check postgres index` or ask `coach my explanation`.

### My explanation

<write here>

### Coach feedback

<the explain-coach agent writes here>

## 14. Review questions (day 1, 3, 7, 21)

1. What is a `ctid`? What does `(0,3)` mean?
2. What does one leaf item hold? Does the index hold the whole row?
3. How many levels does an index on 1 million integers have, and why so few?
4. How many pages does a lookup by an indexed id read on 1 million rows? And by an email with no index?
5. Why can an Index Only Scan still say `Heap Fetches: 1001`? What fixes it?
6. What does a plain CREATE INDEX do to users on a live table? What do you use instead, and what do you check after?
7. Draw the picture from card 4 from memory: root, middle pages, leaves, table, with the counts.

<details><summary>Answers</summary>

1. The address of a row: page number and slot number. `(0,3)` is the third slot of page 0.
2. A key and the address of its row. The row stays in the table.
3. Three levels. A page holds a few hundred entries, so each level multiplies the room by a few hundred.
4. 4 pages (3 index and 1 table). With no index, all 10,301 pages.
5. The table pages are not marked all-visible yet, so Postgres checks the table for each row. VACUUM sets the marks.
6. It blocks writes until it ends (reads work). Use CREATE INDEX CONCURRENTLY, then look for `NOT indisvalid` in `pg_index`.
7. 1 root page (10 entries), 10 middle pages, 2,733 leaf pages, and 10,301 table pages. The leaves point to the table.

</details>

## 15. Go deeper (optional)

None of this is needed for the cards above.

<details><summary>Look inside a page yourself</summary>

The `pageinspect` extension lets you read the raw pages. It needs a superuser, so use it on a test database only.

```sql
CREATE EXTENSION IF NOT EXISTS pageinspect;

-- The map page: root and levels
SELECT root, level FROM bt_metap('l25_big_pkey');

-- One page: root (r), internal (i) or leaf (l)
SELECT type, live_items, btpo_prev, btpo_next
FROM bt_page_stats('l25_big_pkey', 1);

-- The items in one page
SELECT itemoffset, ctid
FROM bt_page_items('l25_big_pkey', 1)
LIMIT 5;
```

`btpo_prev` and `btpo_next` are the links to the left and right leaf. Count the page types in the whole index: 1 root, 10 internal, 2,733 leaf (plus page 0, the map).

</details>

<details><summary>Why leaf pages are 90% full</summary>

A B-tree index is built with a fillfactor of 90 by default. After `CREATE INDEX`, a leaf page had 367 items and about 10% free space (808 of 8,192 bytes). The free space leaves room for new keys, so the first inserts do not split the page. Lesson 26 shows the split.

</details>

<details><summary>Wide keys make a taller index</summary>

The email index (39 MB) is almost twice the size of the id index (21 MB) for the same million rows. A wider key means fewer entries per page, so more leaf pages, and sometimes one more level. A narrow key (an integer) is cheaper than a long text key.

</details>

<details><summary>What the docs say about B-trees</summary>

The PostgreSQL docs say each level of the tree is a doubly linked list of pages, that a metapage sits at the start of the index file, and that over 99% of the pages are leaf pages. Since Postgres 13 a B-tree can store a repeated key once, followed by a list of addresses (deduplication). This is on by default.

</details>

## Connected lessons

- [24. One query, from start to finish](24-one-query-start-to-finish.md): where an index scan fits in the run stop.
- [09. Indexes and B-trees](09-indexes-and-b-trees.md) and [10. Composite, partial and covering indexes](10-composite-partial-and-covering-indexes.md): the long versions.
- [26. What an index costs, and when Postgres ignores it](26-what-an-index-costs.md): the next lesson. Splits, writes, HOT updates and the planner.
- [How Postgres works inside](postgres-internals-visual.md): the long guide, Part 2.
