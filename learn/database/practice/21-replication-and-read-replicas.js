// Lesson 21: Replication and read replicas. Five small tests against your own primary and replica.
// Lesson: learn/database/21-replication-and-read-replicas.md
//
// First make the two servers:
//   PGBIN=/path/to/postgres/bin sh practice/21-make-a-replica.sh
// It needs the pg package. Do this once, in a scratch folder OUTSIDE this repo:
//   mkdir replica-test && cd replica-test
//   npm init -y
//   npm i pg
//   cp /path/to/learn/database/practice/21-replication-and-read-replicas.js .
// Then run:
//   node 21-replication-and-read-replicas.js
//
// It connects to the two servers from the script (primary on port 56432, replica on 56433).
// To use other ones:  PRIMARY_URL=postgres://... REPLICA_URL=postgres://... node 21-replication-and-read-replicas.js
// The user must be a superuser (the test changes settings of the replica with ALTER SYSTEM).
// The script puts every setting back at the end.
//
// Before you run it, write down your guesses:
//   1. Part 1: a row is written on the primary. How many milliseconds until it can be read on the replica?
//   2. Part 2: what happens when you INSERT on the replica?
//   3. Part 3: the replica is made 2 seconds slow. You save a profile on the primary and read it
//      from the replica right away. What do you see? How long is the wait if you wait for the write's LSN?
//   4. Part 4: the primary is idle and the replica is fully up to date. What does
//      now() - pg_last_xact_replay_timestamp() say after 3 seconds?
//   5. Part 5: a 4 second query runs on the replica. The primary deletes rows and runs VACUUM. What happens?
// The lesson, in card 11 (Practice), part C, has the answers. Your times will differ. The shape will not.

const { Client } = require("pg");

const primaryUrl = process.env.PRIMARY_URL || `postgres://${process.env.USER || "postgres"}@127.0.0.1:56432/practice`;
const replicaUrl = process.env.REPLICA_URL || `postgres://${process.env.USER || "postgres"}@127.0.0.1:56433/practice`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function connect(url) {
  const c = new Client({ connectionString: url });
  c.on("error", () => {}); // a killed connection must not crash this script
  await c.connect();
  return c;
}

async function part1Lag(p, r) {
  const times = [];
  for (let i = 0; i < 30; i++) {
    const t0 = performance.now();
    const id = (await p.query("INSERT INTO l21_notes (body) VALUES ('x') RETURNING id")).rows[0].id;
    for (;;) {
      if ((await r.query("SELECT 1 FROM l21_notes WHERE id = $1", [id])).rowCount) break;
      await sleep(0.5);
    }
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  console.log(`Part 1. 30 writes, each read back on the replica. min ${times[0].toFixed(1)} ms, median ${times[15].toFixed(1)} ms, max ${times[29].toFixed(1)} ms`);
}

async function part2WriteOnReplica(r) {
  try {
    await r.query("INSERT INTO l21_notes (body) VALUES ('from the replica')");
    console.log("Part 2. The INSERT on the replica worked (this is not expected)");
  } catch (e) {
    console.log(`Part 2. INSERT on the replica: ${e.code} ${e.message}`);
  }
}

async function part3ReadYourWrites(p, r) {
  await r.query("ALTER SYSTEM SET recovery_min_apply_delay = '2s'");
  await r.query("SELECT pg_reload_conf()");
  await sleep(500);
  const t0 = Date.now();
  const id = (await p.query("INSERT INTO l21_notes (body) VALUES ('profile saved') RETURNING id")).rows[0].id;
  const lsn = (await p.query("SELECT pg_current_wal_lsn() AS lsn")).rows[0].lsn;
  console.log("Part 3. A replica that is 2 seconds slow. A row is saved on the primary, then read on the replica:");
  for (let k = 0; k < 5; k++) {
    const found = (await r.query("SELECT 1 FROM l21_notes WHERE id = $1", [id])).rowCount;
    console.log(`        ${String(Date.now() - t0).padStart(5)} ms after the write: ${found ? "found" : "NOT found"}`);
    await sleep(500);
  }
  const t1 = Date.now();
  const id2 = (await p.query("INSERT INTO l21_notes (body) VALUES ('profile saved 2') RETURNING id")).rows[0].id;
  const lsn2 = (await p.query("SELECT pg_current_wal_lsn() AS lsn")).rows[0].lsn;
  for (;;) {
    if ((await r.query("SELECT pg_last_wal_replay_lsn() >= $1::pg_lsn AS ok", [lsn2])).rows[0].ok) break;
    await sleep(50);
  }
  const found2 = (await r.query("SELECT 1 FROM l21_notes WHERE id = $1", [id2])).rowCount;
  console.log(`        waiting for LSN ${lsn2} took ${Date.now() - t1} ms, then the row was ${found2 ? "found" : "NOT found"}`);
  await r.query("ALTER SYSTEM RESET recovery_min_apply_delay");
  await r.query("SELECT pg_reload_conf()");
  await sleep(2500); // let the replica catch up
}

async function part4IdleClock(p, r) {
  // one small write, wait until the replica has it, then leave both servers idle for 3 seconds
  const id = (await p.query("INSERT INTO l21_notes (body) VALUES ('last write') RETURNING id")).rows[0].id;
  for (;;) {
    if ((await r.query("SELECT 1 FROM l21_notes WHERE id = $1", [id])).rowCount) break;
    await sleep(50);
  }
  await sleep(3000);
  const behind = (await r.query("SELECT now() - pg_last_xact_replay_timestamp() AS behind")).rows[0].behind;
  const lag = (await p.query("SELECT replay_lag FROM pg_stat_replication")).rows[0];
  console.log(`Part 4. Idle primary, replica up to date. now() - pg_last_xact_replay_timestamp() = ${JSON.stringify(behind)}`);
  console.log(`        replay_lag on the primary = ${JSON.stringify(lag && lag.replay_lag)}`);
}

async function part5Conflict(p, r) {
  await r.query("ALTER SYSTEM SET max_standby_streaming_delay = '1s'");
  await r.query("SELECT pg_reload_conf()");
  await sleep(500);
  await p.query("DROP TABLE IF EXISTS l21_big");
  await p.query("CREATE TABLE l21_big (id int PRIMARY KEY, n int) WITH (autovacuum_enabled = off)");
  await p.query("INSERT INTO l21_big SELECT g, 0 FROM generate_series(1, 20000) g");
  await sleep(500);
  const slow = await connect(replicaUrl);
  const running = slow.query("SELECT pg_sleep(4), count(*) FROM l21_big").then(
    () => "finished normally",
    e => `${e.code} ${e.message}`
  );
  await sleep(300);
  await p.query("DELETE FROM l21_big WHERE id <= 10000");
  await p.query("VACUUM l21_big");
  console.log(`Part 5. A 4 second query on the replica, while the primary deletes and VACUUMs: ${await running}`);
  await r.query("ALTER SYSTEM RESET max_standby_streaming_delay");
  await r.query("SELECT pg_reload_conf()");
  await p.query("DROP TABLE l21_big");
  await slow.end().catch(() => {});
}

async function main() {
  const p = await connect(primaryUrl);
  const r = await connect(replicaUrl);
  console.log(`primary in recovery: ${(await p.query("SELECT pg_is_in_recovery() AS x")).rows[0].x}`);
  console.log(`replica in recovery: ${(await r.query("SELECT pg_is_in_recovery() AS x")).rows[0].x}\n`);
  await p.query("DROP TABLE IF EXISTS l21_notes");
  await p.query("CREATE TABLE l21_notes (id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY, body text, created_at timestamptz DEFAULT now())");
  await sleep(500);

  await part1Lag(p, r);
  await part2WriteOnReplica(r);
  await part3ReadYourWrites(p, r);
  await part4IdleClock(p, r);
  await part5Conflict(p, r);

  await p.query("DROP TABLE l21_notes");
  await p.end();
  await r.end();
}

main().catch(err => {
  console.error("Could not run:", err.message);
  console.error("Are the two servers running? Try: PGBIN=/path/to/bin sh practice/21-make-a-replica.sh");
  process.exit(1);
});
