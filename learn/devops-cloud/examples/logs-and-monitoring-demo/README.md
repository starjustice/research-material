# Logs and monitoring lab: a small app to watch, break and measure

- **Made:** 2026-11-13, for [lesson 10](../../10-logs-and-monitoring.md). Run on Docker Desktop 29.3.1.
- **Cost:** nothing. A tiny Node app (no packages to install) in an alpine container.
- **Names:** every Docker name starts with `lesson10-`, so you can find and remove them.

The app prints one JSON line per event, with a level and a request id. It has these routes:

| Route | What it does |
|---|---|
| `/order` | a normal request (`?wait=300` makes it slow) |
| `/fail` | logs an error and answers 500 |
| `/spam?n=2000` | prints n noisy lines |
| `/health` | 200 when healthy, 500 after `/break` |
| `/break` and `/heal` | switch the health answer off and on |

Set `LOG_LEVEL` (debug, info, warn, error) and `LOG_FORMAT` (json or text) with `-e`.

Run every command from this folder.

## 1. Build and start

```bash
docker build -t lesson10-app .
docker run -d --name lesson10-demo -p 127.0.0.1:38010:3000 lesson10-app
```

## 2. Read the logs

```bash
curl -s localhost:38010/order -H 'x-request-id: r-ana'
curl -s localhost:38010/fail -H 'x-request-id: r-cy'
docker logs lesson10-demo
docker logs --tail 2 lesson10-demo
docker logs -t --tail 1 lesson10-demo
```

Only the errors, with `jq`:

```bash
docker logs lesson10-demo 2>&1 | jq -c 'select(.level == "error") | [.msg, .requestId]'
```

All the lines of one request:

```bash
docker logs lesson10-demo 2>&1 | grep r-ana | jq -c '[.level, .msg]'
```

## 3. Compare two containers: with and without log rotation

```bash
docker run -d --name lesson10-nolimit -p 127.0.0.1:38011:3000 lesson10-app
docker run -d --name lesson10-rot --log-opt max-size=10k --log-opt max-file=3 -p 127.0.0.1:38012:3000 lesson10-app
curl -s "localhost:38011/spam?n=2000" > /dev/null
curl -s "localhost:38012/spam?n=2000" > /dev/null
docker logs lesson10-nolimit 2>&1 | wc -c
docker logs lesson10-rot 2>&1 | wc -c
docker inspect --format '{{json .HostConfig.LogConfig.Config}}' lesson10-nolimit lesson10-rot
```

The same thing in a Compose file: see `compose.yaml` in this folder (`docker compose -p lesson10 up -d`).

## 4. Watch a health check turn unhealthy

The Dockerfile checks `/health` every 2 seconds (the real default is 30).

```bash
docker ps --filter name=lesson10-demo --format '{{.Names}} {{.Status}}'
curl -s localhost:38010/break
docker inspect --format '{{.State.Health.Status}} streak={{.State.Health.FailingStreak}}' lesson10-demo
docker inspect --format 'restarts={{.RestartCount}}' lesson10-demo
curl -s localhost:38010/heal
```

Run the `inspect` line several times, a few seconds apart.

## 5. Check from the outside

```bash
node uptime.js http://127.0.0.1:38010/health
```

## 6. Clean up

```bash
docker compose -p lesson10 down
docker rm -f lesson10-demo lesson10-nolimit lesson10-rot
docker rmi lesson10-app
```
