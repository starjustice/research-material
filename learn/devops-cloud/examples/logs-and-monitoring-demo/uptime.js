// Ask the site from OUTSIDE, like a visitor. Run it from another machine for a real uptime check.
async function check(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return res.status === 200 ? "UP" : "DOWN, status " + res.status;
  } catch (err) {
    return "DOWN, " + (err.cause?.code || err.name);
  }
}
check(process.argv[2]).then((result) => console.log(new Date().toISOString().slice(11, 19), process.argv[2], result));
