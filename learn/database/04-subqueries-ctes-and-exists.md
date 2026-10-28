# 04. Subqueries, CTEs and EXISTS

> **Subject:** Database · **Lesson:** 04 · **Made:** 2026-10-16 · **Remade in short cards:** 2026-10-28 · **Status:** ready
>
> **You will be able to:** put one query inside another, split a long query into named steps with WITH, and answer "has at least one" and "has none" questions with EXISTS and NOT EXISTS, without falling into the NOT IN trap.
>
> **Before this:** [Grouping and aggregation](03-grouping-and-aggregation.md) · **Next:** [Window functions](05-window-functions.md)
>
> **How to read it:** one card is one idea. Look at the picture, guess, then press the orange bar to check. The blue bars (📖 More detail) hold the longer explanation. Skip them on the first read, and open them when you want more. About 25 minutes for the cards.

## 1. The idea: ask a friend first

You want to know which orders are **bigger than the average order**. You cannot answer until you know the average. So you ask a friend first, then use the answer.

```mermaid
graph TB
    Q["❓ Orders above average?"] --> A["1. Inner: the average is 48"]
    A --> B["2. Outer: totals above 48"]
```

Notice: the small query sits **inside** the big one, in brackets. Postgres runs the inner query first.

Our tiny table `mini_orders` has 5 orders:

| id | store_id | status | total |
|---|---|---|---|
| 101 | 1 | PAID | 50 |
| 102 | 1 | PENDING | 20 |
| 103 | 2 | CANCELLED | 70 |
| 104 | 3 | PAID | 90 |
| 105 | 3 | PAID | 10 |

```sql
SELECT id, total
FROM mini_orders
WHERE total > (
  SELECT avg(total)
  FROM mini_orders)
ORDER BY id;
```

<details class="guess"><summary>🤔 Guess: which orders come out? Press to check.</summary>

```
 id  | total
-----+-------
 101 |    50
 103 |    70
 104 |    90
(3 rows)
```

The average is (50 + 20 + 70 + 90 + 10) / 5 = 48. Three orders are above 48.

</details>

> **Remember:** a subquery is a query in brackets. Postgres uses its answer in the outer query.

<details class="more"><summary>📖 More detail: the four words, and what happens without a subquery</summary>

- **Subquery:** a query inside brackets, inside another query. Postgres uses its answer in the outer query. (Interview words: *subquery* or *inner query*.)
- **Correlated subquery:** a subquery that uses a value from the outer row, like `s.id`. So Postgres runs it again for every outer row (card 4).
- **CTE:** a named step at the top of a query, written with `WITH name AS (...)`. Later steps read it like a table (card 7). (Interview word: *CTE*, short for *common table expression*.)
- **Unknown:** `NULL` means "no value". When Postgres compares anything with `NULL`, the answer is not true and not false. It is unknown. `WHERE` keeps a row only when the answer is true (card 5).

Without a subquery, your app makes **two trips**: ask for the average, copy 48 into a new query, ask again. A subquery does both in one trip.

```mermaid
graph TB
    A["App asks for the average"] -->|48| B["App copies 48<br/>into a new query"]
    B -->|trip 2| C["Postgres: 101 103 104"]
```

</details>

## 2. Three shapes of an inner answer

The inner query can give back one value, a list, or a whole table. The shape decides where you can put it.

| The inner answer is | It goes in | Example |
|---|---|---|
| one value | `WHERE total > (...)` | above the average |
| a list | `WHERE id IN (...)` | stores that have a PAID order |
| a table | `FROM (...) AS name` | average orders per store |

Our tiny table `mini_stores` has 4 stores. `referred_by` says which store brought this store in. Ana brought Budi and Citra. Budi brought Dewi.

| id | name | referred_by |
|---|---|---|
| 1 | Ana | NULL |
| 2 | Budi | 1 |
| 3 | Citra | 1 |
| 4 | Dewi | 2 |

A list:

```sql
SELECT name
FROM mini_stores
WHERE id IN (
  SELECT store_id
  FROM mini_orders
  WHERE status = 'PAID')
ORDER BY id;
```

<details class="guess"><summary>🤔 Guess: which stores have a PAID order? Press to check.</summary>

```
 name
-------
 Ana
 Citra
(2 rows)
```

The inner query gives the list `1, 3, 3`. Orders 101, 104 and 105 are PAID. Only Ana (1) and Citra (3) are in the list.

</details>

> **Remember:** one value goes after `>` or `=`. A list goes after `IN`. A table goes in `FROM`.

<details class="more"><summary>📖 More detail: the table shape, and an error with many rows</summary>

A table: the average number of orders per store that has orders.

```sql
SELECT round(avg(order_count), 2)
  AS avg_orders
FROM (
  SELECT store_id,
    count(*) AS order_count
  FROM mini_orders
  GROUP BY store_id
) AS per_store;
```

```
 avg_orders
------------
       1.67
```

A table in `FROM` must have a name (`AS per_store`).

**One value must be one row.** This fails, because three orders are PAID:

```sql
SELECT name
FROM mini_stores
WHERE id = (
  SELECT store_id
  FROM mini_orders
  WHERE status = 'PAID');
```

```
ERROR:  more than one row returned by a subquery used as an expression
```

`=` needs one value. Use `IN` for a list.

Make the tables yourself (run once in any Postgres):

```sql
CREATE TABLE mini_stores (
  id int PRIMARY KEY,
  name text NOT NULL,
  referred_by int);
INSERT INTO mini_stores VALUES
  (1, 'Ana', NULL), (2, 'Budi', 1),
  (3, 'Citra', 1), (4, 'Dewi', 2);
CREATE TABLE mini_orders (
  id int PRIMARY KEY,
  store_id int NOT NULL,
  status text NOT NULL,
  total int NOT NULL);
INSERT INTO mini_orders VALUES
  (101, 1, 'PAID', 50),
  (102, 1, 'PENDING', 20),
  (103, 2, 'CANCELLED', 70),
  (104, 3, 'PAID', 90),
  (105, 3, 'PAID', 10);
```

Checked on 2026-10-28 with PostgreSQL 17.5 (PGlite). Earlier checks on PostgreSQL 18.3 gave the same results.

</details>

## 3. EXISTS: has one, has none

"Does this store have at least one PAID order?" is a yes or no question. `EXISTS` answers it. `NOT EXISTS` answers "has none".

```mermaid
graph LR
    ANA["Ana"] --> O101["101 PAID"]
    ANA --> O102["102 PENDING"]
    BUDI["Budi"] --> O103["103 CANCELLED"]
    CITRA["Citra"] --> O104["104 PAID"]
    CITRA --> O105["105 PAID"]
    DEWI["Dewi"] -.-> N["no orders"]
```

```sql
-- has none: stores with no orders
SELECT s.name
FROM mini_stores s
WHERE NOT EXISTS (
  SELECT 1
  FROM mini_orders o
  WHERE o.store_id = s.id)
ORDER BY s.id;
```

<details class="guess"><summary>🤔 Guess: who is returned? And what does plain EXISTS with `AND o.status = 'PAID'` return? Press to check.</summary>

`NOT EXISTS` returns:

```
 name
------
 Dewi
(1 row)
```

`EXISTS (... AND o.status = 'PAID')` returns Ana and Citra. Budi has an order, but it is CANCELLED.

</details>

> **Remember:** "has one" is `EXISTS`. "has none" is `NOT EXISTS`. The answer is always yes or no.

<details class="more"><summary>📖 More detail: EXISTS stops at the first yes</summary>

`SELECT 1` inside EXISTS is a habit. EXISTS only asks "is there a row?". It never looks at the columns.

For Citra, "does store 3 have a PAID order?", Postgres reads the orders until it finds one:

```mermaid
graph TB
    A["read 101: store 1, no"] --> B["read 102: store 1, no"]
    B --> C["read 103: store 2, no"]
    C --> D["read 104: store 3 PAID, yes"]
    D --> E["EXISTS is true. Stop.<br/>105 is never read."]
```

A store **with** a match is cheap, because Postgres stops early. A store **without** a match is the expensive one: Postgres must read everything to be sure.

</details>

## 4. Correlated: once for every row

Here the inner query uses `s.id` from the outer row. So Postgres runs it again for every store.

```sql
SELECT s.name,
  (SELECT count(*)
   FROM mini_orders o
   WHERE o.store_id = s.id) AS n
FROM mini_stores s
ORDER BY s.id;
```

| Outer row | Inner query asks | Answer |
|---|---|---|
| Ana, id 1 | orders of store 1 | 2 |
| Budi, id 2 | orders of store 2 | 1 |
| Citra, id 3 | orders of store 3 | 2 |
| Dewi, id 4 | orders of store 4 | 0 |

<details class="guess"><summary>🤔 Guess: how many times does the inner query run? Press to check.</summary>

4 times, once per store.

```
 name  | n
-------+---
 Ana   | 2
 Budi  | 1
 Citra | 2
 Dewi  | 0
(4 rows)
```

On 4 stores this is nothing. On 200 stores and 100,000 orders it is a problem (see the bar below).

</details>

> **Remember:** a correlated subquery runs once per outer row. Without an index, that can be slow.

<details class="more"><summary>📖 More detail: the same thing at full size, in a real plan</summary>

**A correlated subquery really runs once per row.** Here Postgres counts orders for the 200 stores in Medan:

```sql
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, BUFFERS OFF)
SELECT s.name, (SELECT count(*) FROM orders o WHERE o.store_id = s.id) AS n
FROM stores s WHERE s.city = 'Medan';
```

```
Seq Scan on stores s (actual rows=200.00 loops=1)
  Filter: (city = 'Medan'::text)
  Rows Removed by Filter: 800
  SubPlan 1
    ->  Aggregate (actual rows=1.00 loops=200)
          ->  Seq Scan on orders o (actual rows=100.68 loops=200)
                Filter: (store_id = s.id)
                Rows Removed by Filter: 99899
```

How to read it:

- `SubPlan 1` is the inner query.
- `loops=200` means Postgres ran it 200 times, once per Medan store.
- Each run read all 100,000 orders. That is 20 million rows read in total.
- The fix is an index on `orders(store_id)` ([lesson 09](09-indexes-and-b-trees.md)), or one `JOIN` with `GROUP BY` ([lesson 03](03-grouping-and-aggregation.md)).

Checked on 2026-10-16 with PostgreSQL 18.3 (PGlite). On Postgres 16 you see `rows=200` without the `.00`.

</details>

## 5. Mistake 1: NOT IN and a NULL

Question: "Which stores never brought in another store?" The true answer is Citra and Dewi. A common way:

```sql
SELECT name
FROM mini_stores
WHERE id NOT IN (
  SELECT referred_by
  FROM mini_stores)
ORDER BY id;
```

The inner list is `NULL, 1, 1, 2`. Ana was not referred by anyone, so her `referred_by` is NULL.

```mermaid
graph TB
    Q["Is 3 NOT IN NULL 1 1 2?"] --> C1["3 against NULL: unknown"]
    C1 --> R["NOT IN needs all checks true"]
    R --> X["Unknown, so WHERE drops Citra"]
```

<details class="guess"><summary>🤔 Guess: how many rows come back? Press to check.</summary>

```
 name
------
(0 rows)
```

**Zero rows, and no error.** One NULL in the list makes every check unknown (or false), so no store can be true. It looks like "no such stores".

Fix: `NOT EXISTS` asks "is there a row that points at me?".

```sql
SELECT s.name
FROM mini_stores s
WHERE NOT EXISTS (
  SELECT 1
  FROM mini_stores k
  WHERE k.referred_by = s.id)
ORDER BY s.id;
```

```
 name
-------
 Citra
 Dewi
(2 rows)
```

</details>

> **Remember:** never use `NOT IN` on a list that can hold a NULL. Use `NOT EXISTS`.

<details class="more"><summary>📖 More detail: why every store is dropped</summary>

| Store | id | Checks against NULL, 1, 1, 2 | NOT IN answer | Kept? |
|---|---|---|---|---|
| Ana | 1 | unknown, false, false, true | false | no |
| Budi | 2 | unknown, true, true, false | false | no |
| Citra | 3 | unknown, true, true, true | unknown | no |
| Dewi | 4 | unknown, true, true, true | unknown | no |

Adding `WHERE referred_by IS NOT NULL` inside the NOT IN also works (it gives Citra and Dewi). But you must remember it every time. NOT EXISTS has no such trap.

A guard has a list of banned names. One line is smudged. Citra asks, "I am not on the list, right?" The guard says, "I do not know. The smudge could be you." Nobody gets in. A real guard would fix the list. Postgres never guesses and gives no warning.

</details>

## 6. Mistake 2: JOIN when you want "has one"

"Which stores have a PAID order?" You can write it with a JOIN:

```sql
SELECT s.name
FROM mini_stores s
JOIN mini_orders o
  ON o.store_id = s.id
WHERE o.status = 'PAID'
ORDER BY s.id;
```

<details class="guess"><summary>🤔 Guess: how many rows, and is anything wrong? Press to check.</summary>

```
 name
-------
 Ana
 Citra
 Citra
(3 rows)
```

Citra appears **twice**, because she has two PAID orders. A JOIN makes one row per matching pair (fan-out, [lesson 02](02-joins.md)).

Fix: `EXISTS` keeps each store once.

```sql
SELECT s.name
FROM mini_stores s
WHERE EXISTS (
  SELECT 1
  FROM mini_orders o
  WHERE o.store_id = s.id
    AND o.status = 'PAID')
ORDER BY s.id;
```

That gives Ana and Citra.

</details>

> **Remember:** if you add `DISTINCT` after a JOIN to remove copies, you probably wanted `EXISTS`.

<details class="more"><summary>📖 More detail: when to use which</summary>

| You want | Use |
|---|---|
| Compare with one number, like the average | a subquery that returns one value |
| "Has at least one" | `EXISTS` (IN is fine too) |
| "Has none" | `NOT EXISTS` |
| Columns from the other table | `JOIN` |
| A long query in readable steps | a CTE with `WITH` |

</details>

## 7. A CTE is a list of named steps

A long query with brackets inside brackets is hard to read. A **CTE** gives each step a name, and you read it top to bottom, like a recipe.

```mermaid
graph TB
    S1["paid: PAID total per store"] -->|feeds| S2["big: totals of 60 or more"]
    S2 -->|feeds| S3["Final SELECT adds the name"]
    S3 --> R["Citra 100"]
```

```sql
WITH paid AS (
  SELECT store_id,
    sum(total) AS paid_total
  FROM mini_orders
  WHERE status = 'PAID'
  GROUP BY store_id
),
big AS (
  SELECT store_id, paid_total
  FROM paid
  WHERE paid_total >= 60
)
SELECT s.name, big.paid_total
FROM big
JOIN mini_stores s
  ON s.id = big.store_id;
```

<details class="guess"><summary>🤔 Guess: which store is returned? Press to check.</summary>

```
 name  | paid_total
-------+------------
 Citra |        100
(1 row)
```

Step `paid` gives Ana 50 and Citra 100. Step `big` keeps totals of 60 or more, so Ana (50) is dropped.

</details>

> **Remember:** `WITH name AS (...)` makes a named step. Later steps read it like a table.

<details class="more"><summary>📖 More detail: since Postgres 12, a CTE is usually pasted in</summary>

Postgres can paste a CTE into the main query and plan everything together. This is called **inlining**. By default it happens when the CTE is used only once. If it is used twice or more, Postgres works it out once and keeps the rows. Before Postgres 12, every CTE was kept, so old blog posts say "CTEs are slow in Postgres". That is no longer true by default. The Go deeper card at the end has the real plans, and a recursive CTE.

</details>

## 8. Watch it run, step by step

Five small programs: a plain subquery, a correlated one, EXISTS stopping early, the NOT IN trap, and NOT EXISTS. Counters show how often the inner query ran and how many rows it read.

**Step through it yourself:** [open the subqueries and EXISTS stepper](visuals/04-subqueries-ctes-and-exists.html).

<details class="more"><summary>📖 More detail: the EXISTS query, one store at a time</summary>

The query: "stores with at least one PAID order". Postgres takes the store rows one by one. For each one, it reads orders until it finds a match. This is the simple model. On big tables Postgres often finds a faster way to get the same answer (see Go deeper at the end).

| Step | Outer row | What Postgres does | Orders read | EXISTS | Result so far |
|---|---|---|---|---|---|
| 1 | Ana, id 1 | Plugs 1 into `o.store_id = s.id`. Reads 101: store 1 and PAID. A match. Stops. | 101 | true | Ana |
| 2 | Budi, id 2 | Reads 101, 102: other store. 103: store 2 but CANCELLED. 104, 105: other store. No match. | all 5 | false | Ana |
| 3 | Citra, id 3 | Reads 101, 102, 103: other stores. 104: store 3 and PAID. Stops. 105 is skipped. | 4 | true | Ana, Citra |
| 4 | Dewi, id 4 | Reads all 5 orders. None is store 4. | all 5 | false | Ana, Citra |
| 5 | (done) | Returns the kept rows. | 15 in total | | **Ana, Citra** |

Notice two things:

- A store **with** a match is cheap. Postgres stops early.
- A store **without** a match is the expensive one. Postgres must read everything to be sure. That is also true for NOT EXISTS.

**On the big practice tables** (100,000 orders), EXISTS for one store at a time:

| Store | Has a PAID order? | Order rows Postgres read |
|---|---|---|
| 1 | yes | a few hundred, then it stopped (random seed, so your number differs) |
| 950 (has no orders) | no | all 100,000 |

</details>

## 9. Why it matters and what it costs

- **Without it,** you make two trips with copied numbers, "has none" questions are hard to write, and long queries fill up with nested brackets.
- **With it,** a subquery answers the small question in the same trip. EXISTS asks "is there a matching row?", always yes or no. A CTE names each step.
- **The cost:**
  - A correlated subquery in `SELECT` runs once per outer row. Without an index, that is slow (card 4).
  - A subquery used as one value must return one row. Two rows is an error (card 2).
  - `NOT IN` gives wrong answers when the list holds a NULL (card 5).
  - A CTE used twice is worked out once and kept, so the outer `WHERE` cannot help inside it (Go deeper).

## 10. Watch and play

Links checked on 2026-10-16: each page was opened, and each video's title, channel and length came from YouTube. The videos were not watched.

- **Video:** [How to use the SQL EXISTS and NOT EXISTS conditional operators](https://www.youtube.com/watch?v=BAiQq_u2pd8) by Vlad Mihalcea, 6 minutes. EXISTS and NOT EXISTS with two related tables.
- **Video:** [SQL WITH Clause, Clearly Explained](https://www.youtube.com/watch?v=LJC8277LONg) by Maven Analytics, 13 minutes. CTEs against subqueries, and recursive CTEs.
- **Play with it:** [The subqueries and EXISTS stepper](visuals/04-subqueries-ctes-and-exists.html) in this folder. Guess first, then watch the "rows read" counter.
- **Play with it:** [PostgreSQL Exercises: members with their recommender, using no joins](https://pgexercises.com/questions/joins/sub.html). Run real SQL in the browser. It needs a correlated subquery.
- **Play with it:** [PostgreSQL Exercises: recursive queries](https://pgexercises.com/questions/recursive/). Members recommend members, like `referred_by`. Try it after the recursive Go deeper box.
- **Play with it:** [explain.dalibo.com](https://explain.dalibo.com/). Paste the plan from card 4 and see `SubPlan` and its loops as a diagram.
- **Read:** [PostgreSQL docs: Subquery Expressions](https://www.postgresql.org/docs/current/functions-subquery.html). In the NOT IN part, find the words "null, not true".

<details><summary>More links (optional)</summary>

- **Read:** [PostgreSQL docs: WITH Queries](https://www.postgresql.org/docs/current/queries-with.html), section 7.8.3 "Common Table Expression Materialization". The inline and materialize rules with examples.
- **Read:** [PostgreSQL wiki: Don't Do This](https://wiki.postgresql.org/wiki/Don%27t_Do_This). The part "Don't use NOT IN" gives the NULL reason and the speed reason.
- **Read:** [PostgreSQL 12 release notes](https://www.postgresql.org/docs/release/12.0/). Search for "inlined" to see the CTE change.
- **Video:** [SQL Subquery using EXISTS and IN](https://www.youtube.com/watch?v=sP6MCZ9patk) by Data with Baraa, 10 minutes. Another view of IN against EXISTS.
- **Video:** [SQL CTEs (Common Table Expressions) - Why and How to Use Them](https://www.youtube.com/watch?v=ZaFMM-vNlvc) by Database Star, 8 minutes.
- **Read:** [SQLBolt: Subqueries](https://sqlbolt.com/topic/subqueries). A short page on plain and correlated subqueries. It does not cover EXISTS.

</details>

## 11. Practice

**A. Predict the output** (write your answer before opening)

Same tiny tables. Three queries:

```sql
SELECT name FROM mini_stores WHERE id IN (2, NULL) ORDER BY id;
SELECT name FROM mini_stores WHERE id NOT IN (2, 3) ORDER BY id;
SELECT name FROM mini_stores WHERE id NOT IN (2, NULL) ORDER BY id;
```

<details><summary>Answer</summary>

```
IN (2, NULL)      NOT IN (2, 3)      NOT IN (2, NULL)
 Budi              Ana                (0 rows)
                   Dewi
```

- `IN` needs just one true check. For Budi, `2 = 2` is true. The NULL does not hurt IN.
- `NOT IN (2, 3)` has no NULL, so it works normally.
- `NOT IN (2, NULL)` needs every check to be true. The check against NULL is always unknown. So no row passes.

</details>

**B. Fix the bug**

Your teammate wants "stores that have a PAID order" for a dashboard. The list shows Citra twice.

```sql
SELECT s.name
FROM mini_stores s
JOIN mini_orders o ON o.store_id = s.id
WHERE o.status = 'PAID'
ORDER BY s.id;
-- Ana, Citra, Citra
```

<details><summary>Answer</summary>

```sql
SELECT s.name
FROM mini_stores s
WHERE EXISTS (
  SELECT 1 FROM mini_orders o
  WHERE o.store_id = s.id AND o.status = 'PAID'
)
ORDER BY s.id;
-- Ana, Citra
```

The JOIN makes one row for each matching order. Citra has two PAID orders, so she appears twice. EXISTS asks "is there at least one?" and keeps each store once. `SELECT DISTINCT s.name` also hides the duplicate, but it makes Postgres build all the pairs first and then remove copies.

</details>

**C. Write it yourself**

Open `practice/04-subqueries-ctes-and-exists.sql`. It makes its own tiny tables and has six tasks: one value and IN, a correlated count, EXISTS and NOT EXISTS, a broken NOT IN to fix, a CTE, and finding `loops` in a real plan. A bonus task is a recursive CTE. Every task shows its expected result.

<details><summary>One possible answer</summary>

```sql
-- Task 1a
SELECT id, total FROM l04_orders
WHERE total > (SELECT avg(total) FROM l04_orders)
ORDER BY id;

-- Task 1b
SELECT name FROM l04_stores
WHERE id IN (SELECT store_id FROM l04_orders WHERE status = 'CANCELLED')
ORDER BY id;

-- Task 2
SELECT s.name,
       (SELECT count(*) FROM l04_orders o
        WHERE o.store_id = s.id AND o.status = 'PAID') AS paid_orders
FROM l04_stores s
ORDER BY s.id;

-- Task 3a
SELECT s.name FROM l04_stores s
WHERE EXISTS (SELECT 1 FROM l04_orders o
              WHERE o.store_id = s.id AND o.status = 'PAID' AND o.total >= 100)
ORDER BY s.id;

-- Task 3b
SELECT s.name FROM l04_stores s
WHERE NOT EXISTS (SELECT 1 FROM l04_orders o WHERE o.store_id = s.id)
ORDER BY s.id;

-- Task 4: the blocked list holds a NULL, so every NOT IN check is unknown or false.
SELECT s.name FROM l04_stores s
WHERE NOT EXISTS (SELECT 1 FROM l04_blocked b WHERE b.store_id = s.id)
ORDER BY s.id;

-- Task 5
WITH paid AS (
  SELECT store_id, sum(total) AS paid_total
  FROM l04_orders
  WHERE status = 'PAID'
  GROUP BY store_id
),
big AS (
  SELECT store_id, paid_total FROM paid WHERE paid_total >= 100
)
SELECT s.name, big.paid_total
FROM big JOIN l04_stores s ON s.id = big.store_id
ORDER BY s.id;

-- Task 6
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF)
SELECT s.name,
       (SELECT count(*) FROM orders o WHERE o.store_id = s.id) AS n
FROM stores s
WHERE s.city = 'Bandung';

-- Bonus
WITH RECURSIVE tree AS (
  SELECT id, name, 0 AS depth FROM l04_stores WHERE id = 1
  UNION ALL
  SELECT s.id, s.name, tree.depth + 1
  FROM l04_stores s JOIN tree ON s.referred_by = tree.id
)
SELECT name, depth FROM tree WHERE depth > 0 ORDER BY depth, id;
```

</details>

## 12. Interview question

**Q:** "Find all customers who have never placed an order. Show me two ways. Which one would you use, and why? What happens with NOT IN?"

<details><summary>A strong answer, in four parts</summary>

1. **Problem:** "has none" questions cannot be answered by looking at one customer row. You must ask the orders table "is there any row for this customer?".
2. **How it works:**
   - `NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)`. For each customer, Postgres looks for one matching order. If it finds none, it keeps the customer. Postgres usually turns this into an anti join, so it reads orders once, not once per customer.
   - The other way is `LEFT JOIN orders ... WHERE o.id IS NULL` ([lesson 02](02-joins.md)). It gives the same rows.
   - `NOT IN (SELECT customer_id FROM orders)` breaks when the list holds a NULL. A check against NULL is unknown, NOT IN needs every check to be true, so it returns 0 rows with no error. It is also harder for Postgres to plan, so it can be slow on big lists.
3. **Tradeoff:** I pick NOT EXISTS. It is safe with NULLs, it says what I mean, and Postgres plans it well. JOIN is right when I need columns from the other table. A correlated subquery in the SELECT list runs once per row, so it needs an index on the inner column.
4. **My example:** *This is an idea, not a fact. Replace it with your own real story.* DBO is a B2B commerce app with stores and orders. A list like "stores that have not ordered this month" for the admin CMS is a NOT EXISTS with a date filter inside the subquery. With Prisma or Hasura, you can turn on query logging (or use the Analyze button in the Hasura console) to see which SQL they write for a "has none" filter.

</details>

<details><summary>A follow-up they ask: "Are CTEs slow in Postgres?"</summary>

"Not by default since Postgres 12. A CTE that is used once, has no side effects, and is not recursive is inlined into the main query. So it plans like a subquery. If it is used twice, Postgres works it out once and keeps the rows, and the outer filter cannot reach inside. I can force either way with `MATERIALIZED` or `NOT MATERIALIZED`. I check with EXPLAIN: a `CTE Scan` node means it was kept."

</details>

## 13. Explain it back

Close this file. Press the **Record my explanation** button under this heading and explain this lesson out loud, like to a new junior, in 4 parts: problem, how it works, tradeoff, my example. Use the words "subquery", "correlated", "EXISTS" and "unknown". Try to draw the picture from card 5 while you talk. Then save the transcript file into `my-learning/recordings/`, or write your best version below. Run `/explain-check subqueries` or ask the `explain-coach` agent to review it.

### My explanation

<write here>

### Coach feedback

<the explain-coach agent writes here>

## 14. Review questions (day 1, 3, 7, 21)

1. What is the difference between a normal subquery and a correlated one? How many times does each run?
2. Why does EXISTS often finish fast for a store that has orders, but read everything for a store that has none?
3. The list from a subquery is `5, NULL`. Why does `WHERE id NOT IN (that list)` return no rows? What do you write instead?
4. Draw the picture from card 5 from memory: the NOT IN list with a NULL, the four checks for Citra, and why the answer is unknown.

<details><summary>Answers</summary>

1. A normal subquery does not use the outer row, so Postgres works it out once and uses the answer for every row. A correlated subquery uses a value from the outer row, like `s.id`, so in the simple model it runs once per outer row. In `SELECT`, it really does run once per row (`loops=200` in card 4).
2. EXISTS stops at the first matching row. A store with orders gives a match early. A store with no orders never matches, so Postgres must check every row to be sure.
3. NOT IN means "different from every value". `id <> NULL` is unknown, never true. So the whole NOT IN is unknown or false for every row, and WHERE keeps only true. Write `NOT EXISTS (SELECT 1 FROM ... WHERE x = outer.id)` instead.
4. The list is NULL, 1, 1, 2. For id 3: against NULL is unknown, against 1 is true, against 1 is true, against 2 is true. NOT IN needs all true. One is unknown, so the answer is unknown, and WHERE drops Citra. The same happens to every store, so 0 rows.

</details>

## 15. Go deeper (optional)

Open these when you are ready. None of them is needed for the cards above.

<details><summary>Postgres often does not loop</summary>

The tables above are the simple model. It is the promise Postgres makes: the docs say an EXISTS subquery is "generally only executed long enough to determine whether at least one row is returned".

When EXISTS or NOT EXISTS sits in `WHERE`, Postgres usually rewrites it into a join that does all rows at once. Two interview words for these:

- **Semi join:** keep a row from the left table if it has at least one match. This is EXISTS (and IN).
- **Anti join:** keep a row only if it has no match. This is NOT EXISTS.

On the practice database, the plans look like this:

```
-- EXISTS (... status = 'PAID')            -- NOT EXISTS (...)
Hash Join                                   Hash Right Anti Join
  Hash Cond: (o.store_id = s.id)              Hash Cond: (o.store_id = s.id)
  ->  HashAggregate                           ->  Seq Scan on orders o
        Group Key: o.store_id                 ->  Hash
        ->  Seq Scan on orders o                    ->  Seq Scan on stores s
              Filter: (status = 'PAID'::text)
  ->  Hash
        ->  Seq Scan on stores s
```

Postgres read orders once, not once per store. That is why EXISTS and IN are usually just as fast in modern Postgres.

`NOT IN (subquery)` cannot become an anti join, because of the NULL rule. Postgres runs it as a `hashed SubPlan` instead. The PostgreSQL wiki page "Don't Do This" warns that this can get very slow when the list is too big for memory.

The correlated subquery in the `SELECT` list stays a loop (`SubPlan` with `loops=200`). That is why it needs an index.

</details>

<details><summary>When Postgres inlines a CTE, and when it keeps it</summary>

Since PostgreSQL 12 (released in 2019), a CTE can be **inlined**. That means Postgres pastes the step into the main query and plans everything together. The docs say this happens by default when the CTE:

- is not recursive,
- has no side effects (a plain `SELECT` with no volatile functions like `random()`),
- is used only **once** in the query.

If it is used two or more times, Postgres works it out once and keeps the rows. That is called **materialized**. You can choose yourself with `WITH x AS MATERIALIZED (...)` or `WITH x AS NOT MATERIALIZED (...)`.

Real plans from the practice database:

```sql
WITH paid AS (SELECT * FROM orders WHERE status = 'PAID')
SELECT * FROM paid WHERE store_id = 42;
```

```
-- default: inlined, both filters in one scan
Seq Scan on orders
  Filter: ((status = 'PAID'::text) AND (store_id = 42))

-- with AS MATERIALIZED: all PAID orders first, then the store filter
CTE Scan on paid
  Filter: (store_id = 42)
  CTE paid
    ->  Seq Scan on orders
          Filter: (status = 'PAID'::text)
```

Why this matters: with an index on `store_id`, the inlined version can use it. The materialized version cannot, because it first builds the full list of PAID orders.

Before Postgres 12, every CTE was materialized. People called it an "optimization fence". Old blog posts say "CTEs are slow in Postgres". That is no longer true by default. An interviewer may ask this to see if your knowledge is current.

</details>

<details><summary>A recursive CTE walks the referral tree</summary>

`WITH RECURSIVE` has two parts joined by `UNION ALL`:

1. A **starting row**.
2. A **step** that joins the table to the rows found so far.

Postgres repeats the step until it finds no new rows.

```sql
WITH RECURSIVE tree AS (
  SELECT id, name, 1 AS depth FROM mini_stores WHERE id = 1      -- start: Ana
  UNION ALL
  SELECT s.id, s.name, tree.depth + 1
  FROM mini_stores s JOIN tree ON s.referred_by = tree.id         -- step: who did they bring in?
)
SELECT id, name, depth FROM tree ORDER BY depth, id;
```

```
 id | name  | depth
----+-------+-------
  1 | Ana   |     1
  2 | Budi  |     2
  3 | Citra |     2
  4 | Dewi  |     3
```

Round 1 finds Ana. Round 2 finds who Ana brought in: Budi and Citra. Round 3 finds who they brought in: Dewi. Round 4 finds nobody, so it stops.

On the practice database, the seed makes store `g` referred by store `g / 2`. Walking **up** from store 1000 gives this chain:

```sql
WITH RECURSIVE chain AS (
  SELECT id, referred_by, 1 AS step FROM stores WHERE id = 1000
  UNION ALL
  SELECT s.id, s.referred_by, c.step + 1 FROM stores s JOIN chain c ON s.id = c.referred_by
)
SELECT string_agg(id::text, ' -> ' ORDER BY step) AS path FROM chain;
```

```
1000 -> 500 -> 250 -> 125 -> 62 -> 31 -> 15 -> 7 -> 3 -> 1
```

If the data has a loop (A brought B, B brought A), the query never ends. Guard it with a depth limit like `WHERE depth < 20` in the step, or with the `CYCLE` clause (Postgres 14 and later).

</details>

## Connected lessons

- [Grouping and aggregation](03-grouping-and-aggregation.md): the lesson before. The CTE example uses `GROUP BY`.
- [Joins](02-joins.md): `LEFT JOIN ... WHERE o.id IS NULL` is another way to find "has none".
- [Window functions](05-window-functions.md): the next lesson. It often replaces a correlated subquery.
- [Indexes and B-trees](09-indexes-and-b-trees.md): the fix for a slow correlated subquery.
- [Reading EXPLAIN](11-reading-explain.md): how to spot `SubPlan`, `loops` and `CTE Scan`.
- [PostgreSQL queries and indexing guide](postgresql-queries-interview-guide.md): the longer guide, for revision.
