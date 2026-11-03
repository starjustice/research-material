// Lesson 23: SQL vs NoSQL and Redis. A cache in front of Postgres: reads, stale data and a stampede.
// Lesson: learn/database/23-sql-vs-nosql-and-redis.md
//
// It needs the pg package. Do this once, in a scratch folder OUTSIDE this repo:
//   mkdir cache-demo && cd cache-demo
//   npm init -y
//   npm i pg
//   cp /path/to/learn/database/practice/23-cache-demo.js .
// Then run (use a scratch database: it makes the table l23_prices):
//   DATABASE_URL=postgres://user:pass@localhost:5432/scratch node 23-cache-demo.js
//
// The "cache" here is a Map inside this program, with a time to live. It stands in for Redis.
// A real Redis is a separate server, so every read costs a network trip. I did not run Redis.
// What this shows is the PATTERN (cache-aside), and it does not depend on Redis.
//
// Before you run it, write down your guesses:
//   1. Part 1: 2,000 reads, most of them for a few popular categories. Postgres alone, or with a cache.
//      How many queries reach Postgres with the cache? What is the hit rate?
//   2. Part 2: a price changes in Postgres. The cache still holds the old one. What does a read return?
//      What does it return after you delete the cache key?
//   3. Part 3: the cached value has just expired, and 100 requests ask for it at the same moment.
//      How many queries reach Postgres? And if the 100 requests share one load?

const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 20 });
const ms = start => Math.round(performance.now() - start);

// ---- the cache: a Map with a time to live (ttl) ----
function makeCache() {
  const map = new Map();
  return {
    get(key) {
      const hit = map.get(key);
      if (!hit) return undefined;
      if (Date.now() >= hit.expires) { map.delete(key); return undefined; }
      return hit.value;
    },
    set(key, value, ttlMs) { map.set(key, { value, expires: Date.now() + ttlMs }); },
    del(key) { map.delete(key); },
  };
}

// ---- the slow thing we protect: a report-style query with no index ----
let dbQueries = 0;
async function loadCategory(category) {
  dbQueries++;
  const { rows } = await pool.query(
    "SELECT count(*)::int AS items, sum(price_cents)::bigint AS total_cents FROM l23_prices WHERE category = $1", [category]);
  return { items: rows[0].items, total_cents: Number(rows[0].total_cents) };
}

// ---- cache-aside: look in the cache, else load, then keep it for a while ----
async function cachedLoad(cache, category, ttlMs = 30000) {
  const key = "category:" + category;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const value = await loadCategory(category);
  cache.set(key, value, ttlMs);
  return value;
}

// ---- the same, but a miss that is already being loaded is shared (no stampede) ----
function makeSharedLoader(cache, ttlMs = 30000) {
  const inFlight = new Map();
  return async function (category) {
    const key = "category:" + category;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    if (inFlight.has(key)) return inFlight.get(key);
    const promise = loadCategory(category)
      .then(value => { cache.set(key, value, ttlMs); return value; })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, promise);
    return promise;
  };
}

async function setup() {
  await pool.query("DROP TABLE IF EXISTS l23_prices");
  await pool.query("CREATE TABLE l23_prices (id serial PRIMARY KEY, category int NOT NULL, price_cents int NOT NULL)");
  await pool.query("INSERT INTO l23_prices (category, price_cents) SELECT g % 100, 100 + g % 900 FROM generate_series(1, 100000) g");
  await pool.query("ANALYZE l23_prices");
}

// popular categories come up often: r * r * r makes small numbers more likely
const skewed = () => Math.floor(100 * Math.random() ** 3);

async function part1() {
  const reads = 2000;
  let start = performance.now();
  dbQueries = 0;
  for (let i = 0; i < reads; i++) await loadCategory(skewed());
  console.log(`Part 1a. ${reads} reads, no cache:     ${ms(start)} ms, ${dbQueries} queries to Postgres`);

  const cache = makeCache();
  start = performance.now();
  dbQueries = 0;
  for (let i = 0; i < reads; i++) await cachedLoad(cache, skewed());
  const hits = reads - dbQueries;
  console.log(`Part 1b. ${reads} reads, with cache:   ${ms(start)} ms, ${dbQueries} queries to Postgres, hit rate ${Math.round((100 * hits) / reads)}%`);
}

async function part2() {
  const cache = makeCache();
  const before = await cachedLoad(cache, 7);
  await pool.query("UPDATE l23_prices SET price_cents = price_cents + 1000 WHERE category = 7");
  const stale = await cachedLoad(cache, 7);
  cache.del("category:7");
  const fresh = await cachedLoad(cache, 7);
  console.log(`Part 2.  total before the update: ${before.total_cents}`);
  console.log(`         read right after the update (cache not told):  ${stale.total_cents}   same as before? ${stale.total_cents === before.total_cents}`);
  console.log(`         read after deleting the cache key:             ${fresh.total_cents}`);
}

async function part3() {
  const requests = 100;
  const cache = makeCache();
  dbQueries = 0;
  let start = performance.now();
  await Promise.all(Array.from({ length: requests }, () => cachedLoad(cache, 3)));
  console.log(`Part 3a. ${requests} requests at once, the key is missing: ${dbQueries} ${dbQueries === 1 ? "query" : "queries"} to Postgres, ${ms(start)} ms`);

  const cache2 = makeCache();
  const shared = makeSharedLoader(cache2);
  dbQueries = 0;
  start = performance.now();
  await Promise.all(Array.from({ length: requests }, () => shared(3)));
  console.log(`Part 3b. the same, but sharing the load:          ${dbQueries} ${dbQueries === 1 ? "query" : "queries"} to Postgres, ${ms(start)} ms`);
}

(async () => {
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL (a scratch database).");
  await setup();
  await part1();
  await part2();
  await part3();
  await pool.end();
})().catch(err => { console.error(err); process.exit(1); });
