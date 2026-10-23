// Lesson 20: Connection pooling. A small race you run against your own Postgres.
// Lesson: learn/database/20-connection-pooling.md
//
// It needs the pg package. Do this once, in a scratch folder OUTSIDE this repo:
//   mkdir pool-race && cd pool-race
//   npm init -y
//   npm i pg
//   cp /path/to/learn/database/practice/20-connection-pooling.js .
//
// Start the Docker playground (learn/database/examples/postgres-practice):
//   docker compose up -d
// Then run:
//   node 20-connection-pooling.js
//
// It connects to postgres://practice:practice@localhost:5433/practice (the playground).
// To use another database:  DATABASE_URL=postgres://... node 20-connection-pooling.js
//
// Before you run it, write down your guesses:
//   1. Part 1 opens 100 new connections, one after another. How many ms in total?
//   2. Part 2 runs 100 queries through a pool of 10. Faster or slower than part 1? By how much?
//   3. Part 2 prints how many different Postgres processes served the 100 queries. What number?
//   4. Part 3 has a pool of 2 and 5 slow requests. How many requests must wait in line?
//   5. Part 4 starts 12 "function instances", each with its own pool of 10. What breaks?
// The lesson, section 9C, has the answers. Your times will differ. The shape will not.

const { Client, Pool } = require("pg");

const url = process.env.DATABASE_URL || "postgres://practice:practice@localhost:5433/practice";
const ms = start => Math.round(performance.now() - start);

async function part1NewConnectionEveryTime() {
  const start = performance.now();
  for (let i = 0; i < 100; i++) {
    const client = new Client({ connectionString: url });
    await client.connect(); // Postgres starts a new process for this connection
    await client.query("SELECT 1");
    await client.end(); // the process stops again
  }
  console.log(`Part 1. 100 new connections, one query each: ${ms(start)} ms`);
}

async function part2PoolOfTen() {
  const pool = new Pool({ connectionString: url, max: 10 });
  const start = performance.now();
  const jobs = [];
  for (let i = 0; i < 100; i++) jobs.push(pool.query("SELECT pg_backend_pid() AS pid"));
  const results = await Promise.all(jobs);
  const pids = new Set(results.map(r => r.rows[0].pid));
  console.log(`Part 2. 100 queries through a pool of 10: ${ms(start)} ms`);
  console.log(`        different Postgres processes used: ${pids.size}`);
  await pool.end();
}

async function part3WaitingInLine() {
  // A pool of 2 lines. A request waits at most 700 ms for a free line.
  const pool = new Pool({ connectionString: url, max: 2, connectionTimeoutMillis: 700 });
  const start = performance.now();
  const log = msg => console.log(`        ${String(ms(start)).padStart(4)} ms  ${msg}`);
  console.log("Part 3. Pool of 2. Five requests, each runs a 500 ms query.");
  const jobs = [1, 2, 3, 4, 5].map(n =>
    pool
      .query("SELECT pg_sleep(0.5)")
      .then(() => log(`request ${n} done`))
      .catch(err => log(`request ${n} FAILED: ${err.message}`))
  );
  await new Promise(r => setTimeout(r, 20));
  log(`lines in use ${pool.totalCount - pool.idleCount}, waiting in line ${pool.waitingCount}`);
  await Promise.all(jobs);
  await pool.end();
}

async function part4ServerlessStorm() {
  // 12 "function instances". Each one makes its own pool of 10, like a serverless function would.
  const instances = Array.from({ length: 12 }, () => new Pool({ connectionString: url, max: 10 }));
  let ok = 0;
  const errors = new Map();
  const jobs = [];
  for (const pool of instances) {
    for (let i = 0; i < 10; i++) {
      jobs.push(
        pool
          .query("SELECT pg_sleep(0.3)")
          .then(() => ok++)
          .catch(err => errors.set(err.message, (errors.get(err.message) || 0) + 1))
      );
    }
  }
  await Promise.all(jobs);
  console.log("Part 4. 12 instances x pool of 10 = 120 connections wanted at once.");
  console.log(`        queries that worked: ${ok}`);
  for (const [message, count] of errors) console.log(`        failed ${count} times: ${message}`);
  await Promise.all(instances.map(p => p.end()));
}

async function main() {
  const check = new Client({ connectionString: url });
  await check.connect();
  const max = (await check.query("SHOW max_connections")).rows[0].max_connections;
  console.log(`Connected. This server allows max_connections = ${max}\n`);
  await check.end();

  await part1NewConnectionEveryTime();
  await part2PoolOfTen();
  await part3WaitingInLine();
  await part4ServerlessStorm();
}

main().catch(err => {
  console.error("Could not run:", err.message);
  console.error("Is the Docker playground running? Try: docker compose up -d");
  process.exit(1);
});
