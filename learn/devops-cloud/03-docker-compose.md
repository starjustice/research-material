# 03. Docker Compose

> **Subject:** DevOps and Cloud · **Lesson:** 03 · **Made:** 2026-11-13 · **Status:** ready
>
> **You will be able to:** start a web app, a database and a cache with one file and one command, say how the services find each other, keep the database data when the stack is removed, and make the web app wait until Postgres is really ready.
>
> **Before this:** [Docker images and layers](02-docker-images-and-layers.md) · **Next:** [Kubernetes objects](04-kubernetes-objects.md)
>
> **How to read it:** one card is one idea. Look at the picture, guess, then press the orange bar to check. The blue bars (📖 More detail) hold the longer explanation with real output. Skip them on the first read, and open them when you want more. Every output was run on Docker 29.3.1 with Compose v5.1.1 (checked 2026-11-13). About 20 minutes for the cards.

<!-- quick-summary:start -->
## Quick summary

> Short on time? Read only this. These are the "Remember" lines from the cards below, so you can read the whole lesson in one minute.

- One file describes the whole app. One command starts it, one command stops it, on one machine.
- Inside Compose, the host name is the service name. `localhost` is only yourself.
- `HOST:CONTAINER`. Containers talk on the container port. Publish only what outsiders need.
- `down` keeps a named volume. `down -v` deletes it, and your data with it.
- `depends_on` alone means "started". It does not mean "ready".
- A healthcheck plus `condition: service_healthy` waits for ready. A shorter interval waits less.
- `environment` and `env_file` for settings, profiles for optional services, `watch` for live code in development. Never commit real secrets.
- If you freeze, say "One file for the whole app on one machine. Services find each other by name. `depends_on` needs a healthcheck. `down` keeps the volume, `down -v` deletes it."
<!-- quick-summary:end -->

## 1. The idea: one file for the whole app

Your app is not one container. It is a web server, a database and a cache. By hand that is five commands (a network, a volume and three containers), each with many flags. Forget one flag and the app breaks on a new laptop.

A **Compose file** (`compose.yaml`) is one text file that describes the whole app. Each box in it is a **service**: web, db, cache. One command, `docker compose up -d`, makes everything. It is like a stage plan for a band: one sheet says who stands where. (The analogy stops here: Compose also starts the band.)

```mermaid
graph TB
    F["compose.yaml<br/>one text file"] --> U["docker compose up -d"]
    U --> N["1 network"]
    U --> V["1 volume"]
    U --> S["3 services<br/>web, db, cache"]
```

Notice: you write the file once. Compose does the five commands for you, in the right order.

<details class="guess"><summary>🤔 Guess: can you use Compose to run your app across three servers? Press to check.</summary>

**No.** Compose runs everything on **one machine**. It is for local development, tests and a small single server. For many servers you need Swarm or Kubernetes (lesson [04](04-kubernetes-objects.md)).

</details>

> **Remember:** one file describes the whole app. One command starts it, one command stops it, on one machine.

<details class="more"><summary>📖 More detail: the real file, the commands, and what Compose is for</summary>

**The real file.** I built a small stack to test everything in this lesson: a tiny Node web server, Postgres 17 and Redis 7. This is its `compose.yaml`. The password `secret` is only for the test. Real passwords never go into git.

```yaml
services:
  web:
    build: ./app
    ports:
      - "3100:3000"
    environment:
      DATABASE_URL: postgres://postgres:secret@db:5432/postgres
      REDIS_URL: redis://cache:6379
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started
  db:
    image: postgres:17-alpine
    env_file: ./db.env
    volumes:
      - dbdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 2s
      timeout: 3s
      retries: 10
  cache:
    image: redis:7-alpine
  psql:
    image: postgres:17-alpine
    profiles: ["tools"]
    entrypoint: ["psql", "postgres://postgres:secret@db:5432/postgres"]
volumes:
  dbdata:
```

`db.env` holds one line: `POSTGRES_PASSWORD=secret`. The rest of the lesson explains each part.

**No `version:` key.** Old files started with `version: "3.8"`. Today Compose ignores it. I put it in a file and ran `docker compose config`:

```
the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion
```

The Docker docs say the same: the property "is only informative", and "Compose always uses the most recent schema to validate the Compose file". The file name is `compose.yaml` (preferred) or `compose.yml`, in the working directory (docs: [How Compose works](https://docs.docker.com/compose/intro/compose-application-model/), opened 2026-11-13).

**The commands you use every day.**

| Command | What it does |
|---|---|
| `docker compose up -d` | Make and start everything, in the background |
| `docker compose ps` | List the containers of this project |
| `docker compose logs web` | Show the output of one service |
| `docker compose exec web sh` | Run a command inside a running container |
| `docker compose down` | Remove the containers and the network. Keeps named volumes |
| `docker compose down -v` | Also remove the named volumes (card 4) |
| `docker compose config` | Print the final file after Compose reads it. Good for checking mistakes |

**What Compose is for, and what it is not.**

| Use | Fit |
|---|---|
| Your laptop: the whole stack with one command | Yes, the main use |
| Tests and CI: a clean database for every run | Yes |
| One small server | Yes, with care. The Docker docs say "The easiest way to deploy an application is to run it on a single server" ([Use Compose in production](https://docs.docker.com/compose/how-tos/production/), opened 2026-11-13). One machine is still one point of failure |
| Many servers, rolling updates, self healing | No. The same docs say to run Compose apps on a Swarm cluster to scale. Kubernetes is the other big answer (lesson 04) |

**Where CapRover fits.** CapRover, which you use, is built on Docker Swarm (the [CapRover site](https://caprover.com/) lists Docker, nginx, Let's Encrypt and Docker Swarm, and the [internals guide](docker-caprover-internals.md) in this folder shows the deploy steps). So the ladder is: one container, Compose on one machine, Swarm or CapRover on a few machines, Kubernetes for the big setups. The [orchestration guide](container-orchestration-guide.md) walks the whole ladder.

</details>

## 2. Services find each other by name

A container's address (its IP) changes every time Compose recreates it, so you cannot write an address in your settings. Compose puts all services on one private network and gives each service a name. Your web code connects to **`db:5432`**. Docker's built in name lookup (**DNS**) turns `db` into the current address.

The trap: inside the web container, **`localhost` means the web container itself**, not your laptop and not db.

```mermaid
graph TB
    W["web container"] -->|1 who is db| D["Docker name lookup<br/>127.0.0.11"]
    D -->|2 it is 172.18.0.2| W
    W -->|3 connect to db 5432| P["db container<br/>172.18.0.2"]
```

Notice: web never needs to know the address. It only needs the name.

<details class="guess"><summary>🤔 Guess: your web code connects to `localhost:5432`. Postgres runs in the db container on the same network. Does it work? Press to check.</summary>

**No.** The real run printed `ECONNREFUSED`. Nothing listens on port 5432 inside web. Change `localhost` to `db` and it connects.

</details>

> **Remember:** inside Compose, the host name is the service name. `localhost` is only yourself.

<details class="more"><summary>📖 More detail: the trace, the real output, and two networks</summary>

**What happens when web connects to `db`:**

| Step | What happens | State after |
|---|---|---|
| 1 | web's code calls `connect("db", 5432)` | web needs an address |
| 2 | web reads `/etc/resolv.conf`. It says `nameserver 127.0.0.11` | the name server is Docker's own, inside the network |
| 3 | Docker's name server looks up the service name `db` | it finds the db container on this network |
| 4 | It answers `172.18.0.2` | web has an address |
| 5 | web opens a connection to `172.18.0.2:5432` | Postgres accepts it |

**Real output** from inside the running web container:

```
$ docker compose exec web cat /etc/resolv.conf
nameserver 127.0.0.11
options ndots:0

$ docker compose exec web getent hosts db cache web
172.18.0.2        db  db
172.18.0.3        cache  cache
172.18.0.4        web  web

$ docker compose exec web node -e 'net.connect(5432, "localhost")'
ECONNREFUSED

$ docker compose exec web node -e 'net.connect(5432, "db")'
connected to db
```

From another container, `docker compose exec cache wget -qO- http://web:3000/health` printed `{"ok":true}`. The name `web` worked from the cache container too.

**The default network.** You do not need a `networks:` key. Compose makes one network called `<project>_default` (here `lesson03_default`) and puts every service on it. The Docker docs: "Each service registers its name with an internal DNS server", and "you should always reference services by name, not IP address" ([Networking in Compose](https://docs.docker.com/compose/how-tos/networking/), opened 2026-11-13).

**Two networks hide a service on purpose.** I wrote proxy on `frontend`, api on both, db on `backend`, and asked each one to look up the others:

```
proxy -> api: 172.20.0.3        api  api
proxy -> db: NOT FOUND
api -> db: 172.19.0.2        db  db
db -> api: 172.19.0.3        api  api
db -> proxy: NOT FOUND
```

A service finds only the services that share a network with it. This is a cheap way to keep the database away from a public facing proxy. Practice C has a function for it.

</details>

## 3. Ports: the door from your laptop

Services on the network can talk to each other, but your laptop cannot see inside. A line in `ports` opens one door: **`"3100:3000"` is host port first, container port second.** Your browser uses 3100. Inside the network, everybody uses 3000. Only web needs a door. db has none, so only web can reach it.

```mermaid
graph TB
    L["Your laptop<br/>localhost 3100"] -->|published port| W["web container<br/>listens on 3000"]
    W -->|container port 5432| D["db container<br/>no published port"]
```

Notice: the arrow between web and db uses 5432. The 3100 only matters on the laptop side.

<details class="guess"><summary>🤔 Guess: `docker compose ps` shows db as `5432/tcp` with no arrow. Can a program on your laptop connect to this db? Press to check.</summary>

**No.** The db container has no door to your laptop. The web container can still reach it, because they share a network. Publish a database port only when you really need it, for example to open a database tool.

</details>

> **Remember:** `HOST:CONTAINER`. Containers talk on the container port. Publish only what outsiders need.

<details class="more"><summary>📖 More detail: the request trace and the real `ps` output</summary>

**One request, step by step:**

| Step | What happens | State after |
|---|---|---|
| 1 | `curl localhost:3100/notes` on your laptop | the request goes to host port 3100 |
| 2 | Docker forwards it to port 3000 in the web container | web's code runs |
| 3 | web asks Docker's name lookup for `db` (card 2) | web has `172.18.0.2` |
| 4 | web connects to `db:5432` and asks for the row count | db answers 3 |
| 5 | web sends `{"notes":3}` back the same way | your laptop prints it |

**Real output** (the CREATED column is left out):

```
$ docker compose ps
NAME               IMAGE                COMMAND                  SERVICE   STATUS                   PORTS
lesson03-cache-1   redis:7-alpine       "docker-entrypoint.s…"   cache     Up 7 seconds             6379/tcp
lesson03-db-1      postgres:17-alpine   "docker-entrypoint.s…"   db        Up 7 seconds (healthy)   5432/tcp
lesson03-web-1     lesson03-web         "docker-entrypoint.s…"   web       Up 4 seconds             0.0.0.0:3100->3000/tcp, [::]:3100->3000/tcp
```

`0.0.0.0:3100->3000/tcp` means: every network interface of the machine, host port 3100, goes to container port 3000. On a laptop that is fine. On a server it means anyone who can reach the machine can reach the port.

To open a port for this machine only, write `"127.0.0.1:6392:6379"`. I tried it with Redis, and `ps` showed `127.0.0.1:6392->6379/tcp`, while the normal form showed `0.0.0.0:6391->6379/tcp`.

The Docker docs say: "Networked service-to-service communication uses the `CONTAINER_PORT`", and "The host port is only used when accessing the service from outside the network" (opened 2026-11-13).

</details>

## 4. Volumes: data that outlives the container

A container's own storage is removed together with the container. A database stored there loses every row. A **volume** is a folder that Docker keeps outside the container and mounts into it. You declare it under `volumes:` and mount it in db.

`docker compose down` removes the containers and the network, and **keeps** the volume. `docker compose down -v` removes the volume too.

```mermaid
graph TB
    C["db container<br/>can be removed"] -->|mounted at the data folder| V["volume dbdata<br/>kept by Docker"]
    A["down"] -->|removes| C
    B["down -v"] -->|removes| C
    B -->|and removes| V
```

Notice: `-v` is the only thing that touches the volume.

<details class="guess"><summary>🤔 Guess: the database has 3 rows on a named volume. You run `down`, then `up -d`. How many rows now? And after `down -v`, then `up -d`? Press to check.</summary>

**3, then 0.** `down` kept the volume, so Postgres found its old files. `down -v` deleted the volume, so Postgres started again from nothing. I ran both with a real row count.

</details>

> **Remember:** `down` keeps a named volume. `down -v` deletes it, and your data with it.

<details class="more"><summary>📖 More detail: the real run, the three places a file can live, and bind mounts</summary>

**The real run** (the stack from card 1, shortened; the row count came from `psql` inside the db container):

```
$ docker compose exec db psql -U postgres -tA -c "select count(*) from notes"
3
$ docker compose down
 Container lesson03-web-1 Removed
 Container lesson03-db-1 Removed
 Network lesson03_default Removed
$ docker volume ls --filter name=lesson03
local     lesson03_dbdata
$ docker compose up -d      # then count again
3
$ docker compose down -v
 Volume lesson03_dbdata Removed
$ docker volume ls --filter name=lesson03
(nothing)
$ docker compose up -d      # then count again
0
```

**Three places a file can live.** I wrote a file in each place, then ran the commands and checked the file:

| Where the file lives | `stop` then `start` | `down` then `up` | `down -v` then `up` |
|---|---|---|---|
| The container's own storage | kept | **lost** | **lost** |
| A named volume (`dbdata:/data`) | kept | kept | **lost** |
| A bind mount (`./hostdir:/bound`) | kept | kept | kept |

A **bind mount** shares a folder of your own machine with the container. Compose never removes it. It is handy for code you edit. A named volume is the better choice for database files: the Docker docs call volumes "the preferred mechanism for persisting data generated by and used by Docker containers", and note that bind mounts "are dependent on the directory structure and OS of the host machine" ([Volumes](https://docs.docker.com/engine/storage/volumes/), opened 2026-11-13).

The docs for `down` say it removes "named volumes declared in the volumes section" only with `-v` ([docker compose down](https://docs.docker.com/reference/cli/docker/compose/down/), opened 2026-11-13).

I used Postgres 17, whose data folder is `/var/lib/postgresql/data`. Read the image page for the folder of the version you use.

</details>

## 5. `depends_on` waits for running, not for ready

web needs the database, so you write `depends_on: [db]`. Compose starts db first. But Compose only waits until db is **running**. Postgres needs about one more second to build its files. If web connects in that second, it is refused. In my app, web then exits.

```mermaid
sequenceDiagram
    participant C as Compose
    participant D as db
    participant W as web
    C->>D: start db
    Note over D: running but not ready
    C->>W: db is running so start web
    W->>D: connect to db 5432
    D-->>W: ECONNREFUSED
    Note over D: ready 0.6 s later
```

Notice: Compose never asked Postgres anything. It only saw that the container was running.

<details class="guess"><summary>🤔 Guess: the same file ran 3 times on a fresh volume, and 3 times on a volume that already existed. How often did web crash? Press to check.</summary>

**3 of 3 on a fresh volume, and 0 of 3 on an existing volume.** A fresh Postgres builds its files first, so it is slow. An old one starts faster. The bug depends on timing, so it passes on your laptop and fails in a new CI job.

</details>

> **Remember:** `depends_on` alone means "started". It does not mean "ready".

<details class="more"><summary>📖 More detail: the real error, the timeline, the trace, and the stepper</summary>

**The real output** with plain `depends_on: [db, cache]` (shortened):

```
$ docker compose up -d
 Container lesson03-db-1 Started
 Container lesson03-cache-1 Started
 Container lesson03-web-1 Started
$ docker compose ps -a
SERVICE   STATUS
cache     Up 6 seconds
db        Up 6 seconds
web       Exited (1) 5 seconds ago
$ docker compose logs web
web-1  | db connection failed: ECONNREFUSED connect ECONNREFUSED 172.18.0.2:5432
```

**The timeline** (seconds after the db container started, from the container logs):

| Time | What happened |
|---|---|
| 0.00 s | db container is running |
| 0.09 s | Compose starts web, because db is running |
| 0.33 s | web is refused and exits with code 1 |
| 0.96 s | Postgres logs `database system is ready to accept connections` |

On the first start the Postgres image also runs a short temporary server, shuts it down, and then starts the real one. You can see this in `docker compose logs db`.

**Step by step.** [Open the stepper](visuals/03-docker-compose.html), tab 1, to press Next through it.

| Step | What Compose and Docker do | State after |
|---|---|---|
| 1 | Compose reads the file. web needs db and cache, so the order is db, cache, web | nothing created |
| 2 | Compose creates the network and the volume | both exist, empty |
| 3 | Compose starts db and cache | db is running, but Postgres is still building files |
| 4 | Compose asks: is db running? Yes. It starts web | web is running |
| 5 | web connects to `172.18.0.2:5432` | refused, nobody listens yet |
| 6 | web prints the error and exits with code 1 | `web Exited (1)` |
| 7 | Postgres becomes ready, 0.6 s too late | db ready, web gone |

**The Docker docs say it directly:** "On startup, Compose does not wait until a container is "ready", only until it's running." ([Control startup and shutdown order](https://docs.docker.com/compose/how-tos/startup-order/), opened 2026-11-13).

**A second fix: retry.** I added `restart: on-failure` to web. It failed twice, then listened 0.9 s after the first try:

```
db connection failed: ECONNREFUSED connect ECONNREFUSED 172.18.0.2:5432
db connection failed: ECONNREFUSED connect ECONNREFUSED 172.18.0.2:5432
web listening on 3000
```

That works, but it fills the logs with errors and hides the real order. The healthcheck in card 6 is cleaner. In production, do both: a healthcheck for the start, and a retry in the app, because a database can restart at any time.

</details>

## 6. Healthcheck: ask the database if it is ready

A **healthcheck** is a small command that Docker runs inside the container every few seconds. Exit code 0 means healthy. For Postgres the command is `pg_isready`. Then you change web to wait for it: `depends_on: db: condition: service_healthy`. Now Compose keeps web waiting until the check passes. You pay up to one check interval.

```mermaid
graph TB
    A["db is running<br/>health is starting"] --> B["pg_isready every 2 s"]
    B -->|exit 0| C["db is healthy"]
    C --> D["web starts and connects"]
```

Notice: web starts only after a command that asks Postgres itself.

<details class="guess"><summary>🤔 Guess: Postgres is ready at 1 second. The check runs every 2 seconds. When does web start? Press to check.</summary>

**At the first check, about 2 seconds.** Compose only learns about ready from the check, and the first check comes one interval after the start. In my real run the first check passed 2.1 s after db started, and web started at 2.6 s.

</details>

> **Remember:** a healthcheck plus `condition: service_healthy` waits for ready. A shorter interval waits less.

<details class="more"><summary>📖 More detail: the step by step trace, real output, and one-shot jobs</summary>

**Step by step.** [Open the stepper](visuals/03-docker-compose.html), tab 2. Times are seconds after the db container started, from my real run:

| Step | What Compose and Docker do | State after |
|---|---|---|
| 1 | Compose reads the file: web waits for db to be healthy | nothing created |
| 2 | Compose creates the network and the volume, then the containers | 3 containers exist, none running |
| 3 | Compose starts db and cache (0.0 s). It prints `Container db Waiting` | db running, health `starting`. web not started |
| 4 | Postgres finishes its first setup (0.95 s) | db can take connections, but health is still `starting` |
| 5 | First check runs (2.1 s): `pg_isready` exits with 0 | db is `healthy` |
| 6 | Compose prints `Container db Healthy` and starts web (2.6 s) | web is running |
| 7 | web connects to `db:5432`, makes its table and listens on 3000 | `ps`: db `Up (healthy)`, web `Up` |

**Real output** of `docker compose up -d --wait`, shortened (the `--wait` flag also waits for everything to be running or healthy):

```
 Container lesson03-db-1 Started
 Container lesson03-db-1 Waiting
 Container lesson03-db-1 Healthy
 Container lesson03-web-1 Starting
 Container lesson03-web-1 Started
took 3.5 s
$ docker compose ps
db   Up 3 seconds (healthy)
web  Up Less than a second
```

**The healthcheck lines:**

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U postgres"]
  interval: 2s       # how often to ask
  timeout: 3s        # how long one check may take
  retries: 10        # failed checks in a row before the service is unhealthy
```

**No healthcheck, no `service_healthy`.** I wrote `condition: service_healthy` for a service with no healthcheck. Compose stopped with:

```
dependency failed to start: container lesson03t1-a-1 has no healthcheck configured
```

**The three conditions** (Docker docs, [services reference](https://docs.docker.com/reference/compose-file/services/), opened 2026-11-13):

| Condition | web starts when db is... |
|---|---|
| `service_started` | running (the default) |
| `service_healthy` | running and its healthcheck passes |
| `service_completed_successfully` | finished with exit code 0 |

**A one-shot job.** I tested `service_completed_successfully` with a `migrate` service that ran one `psql` command to make the table, then exited. Compose waited for it, saw `Exited`, and started web. `ps -a` showed `migrate  Exited (0)` and `web  Up`. An **idea, not tested:** the same shape fits a Prisma migration (`prisma migrate deploy`) before the API starts.

</details>

## 7. Settings and extras

Keep settings out of the image. **`environment:`** writes them in the file (web's `DATABASE_URL`). **`env_file:`** loads them from a separate file that you keep out of git (db's password). A **profile** hides an optional service: `psql` has `profiles: ["tools"]`, so a plain `up` skips it and `--profile tools` includes it. **`docker compose watch`** updates a running container while you edit code.

| Key | What it does | In my file |
|---|---|---|
| `environment` | Settings written in the file | `DATABASE_URL: ...@db:5432/...` |
| `env_file` | Settings loaded from a file | `env_file: ./db.env` |
| `profiles` | The service starts only when asked | `psql` with profile `tools` |
| `watch` | Copies changed code into the container, or rebuilds it | not in my file |

<details class="guess"><summary>🤔 Guess: `psql` has `profiles: ["tools"]`. Does a plain `docker compose up` start it? Press to check.</summary>

**No.** The Docker docs: "Services without a `profiles` attribute are always enabled", so a service with a profile starts only when you name the profile. My `config --services` listed cache, db and web, and added psql with `--profile tools`.

</details>

> **Remember:** `environment` and `env_file` for settings, profiles for optional services, `watch` for live code in development. Never commit real secrets.

<details class="more"><summary>📖 More detail: real output, the docs, and the watch actions</summary>

**Real output:**

```
$ docker compose config --services
cache
db
web
$ docker compose --profile tools config --services
cache
db
psql
web
$ docker compose run --rm psql -c "select count(*) from notes"
 count
-------
     0
```

**`env_file`.** The docs: "The paths to your `.env` file, specified in the `env_file` attribute, are relative to the location of your `compose.yaml` file." With several files, later ones override earlier ones ([Set environment variables](https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/), opened 2026-11-13).

**`watch`** (from the docs only, I did not run it). The `develop: watch:` block has three actions: **sync** copies changed files into the container, **rebuild** builds a new image and replaces the container, and **sync+restart** copies and then restarts ([Use Compose Watch](https://docs.docker.com/compose/how-tos/file-watch/), opened 2026-11-13). A common use: sync your `src` folder, and rebuild when `package.json` changes.

**Profiles** ([Using profiles with Compose](https://docs.docker.com/compose/how-tos/profiles/), opened 2026-11-13). Good for tools you sometimes want: a database client, a debug container, a test runner.

**For your stack** (idea, not tested): an Express app with Prisma needs the host name `db` in `DATABASE_URL`, never `localhost`, as in card 2.

</details>

## 8. Five mistakes, and what to say if you freeze

- **Wrong:** `localhost` as the database host in a container. **Right:** the service name, `db`.
- **Wrong:** `depends_on: [db]` and hoping. **Right:** a healthcheck and `service_healthy`.
- **Wrong:** `docker compose down -v` to "clean up" when the volume holds your only data. **Right:** `down`.
- **Wrong:** publishing the database port on a server. **Right:** no `ports` on db, or `127.0.0.1:...`.
- **Wrong:** using Compose as a cluster. **Right:** Compose on one machine, Swarm or Kubernetes for many.

<details class="guess"><summary>🤔 Guess: your colleague says "Compose restarts a crashed web service by itself, so depends_on is fine". Is that true? Press to check.</summary>

**Not by default.** In my first run web stayed `Exited (1)`. Compose restarts a service only if you set `restart:`. With `restart: on-failure` web did recover after two tries, but the logs filled with errors. A healthcheck is cleaner.

</details>

> **Remember:** if you freeze, say "One file for the whole app on one machine. Services find each other by name. `depends_on` needs a healthcheck. `down` keeps the volume, `down -v` deletes it."

<details class="more"><summary>📖 More detail: the five mistakes in full, and the freeze plan</summary>

**Wrong:**

```yaml
DATABASE_URL: postgres://postgres:secret@localhost:5432/postgres
```

**Right:**

```yaml
DATABASE_URL: postgres://postgres:secret@db:5432/postgres
```

**Why:** `localhost` is the web container itself. I ran this file. web failed with `ECONNREFUSED` even though the database had been ready for a long time.

**Wrong:**

```yaml
depends_on:
  - db
```

**Right:**

```yaml
depends_on:
  db:
    condition: service_healthy
```

(and a `healthcheck` on db). **Why:** the short form means `service_started`.

**Wrong:**

```
docker compose down -v      # "just to clean up"
```

**Right:**

```
docker compose down         # keeps the named volume
```

**Why:** `-v` deletes the database files. In my test the row count went from 3 to 0.

**Wrong:**

```yaml
db:
  ports:
    - "5432:5432"           # opens the database to the network
```

**Right:** leave `ports` out of db. Use `docker compose exec db psql ...` or the `psql` profile when you need a prompt. If a tool on your laptop needs it, write `"127.0.0.1:5432:5432"`.

**Wrong:** "We run our production on 3 servers with one compose file."
**Right:** Compose controls one Docker engine, so one machine. The docs say to run Compose apps on a Swarm cluster to scale.

**If you freeze:**

1. Say "A Compose file describes the services, the network and the volumes of one app, and one command starts all of it."
2. Say "Services reach each other by service name on the container port, and `depends_on` needs a healthcheck to mean ready."
3. Say "Named volumes survive `down`, and only `down -v` removes them."

</details>

## 9. Watch and play

Links were checked on 2026-11-13. For the video I read the title and channel from the YouTube oEmbed data and the length from the video page. I did not watch it. For the docs I opened each page and read the parts named below. If a link is broken, tell me and I will replace it.

- **Video (2 min 46 s):** [Docker Compose depends_on Explained: Control Container Startup Order for Beginners](https://www.youtube.com/watch?v=Z-8-yXLFF-U) - CodeLucky. A short look at cards 5 and 6.
- **Play with it:** [the stepper in this folder](visuals/03-docker-compose.html) - guess first, then press Next. Four tabs: plain `depends_on`, the healthcheck fix, names and ports, `down` and `down -v`.
- **Diagram:** [Docker docs: How Compose works](https://docs.docker.com/compose/intro/compose-application-model/) - services, networks and volumes, with a picture of a frontend and a backend on two networks.
- **Read:** [Control startup and shutdown order in Compose](https://docs.docker.com/compose/how-tos/startup-order/) - the sentence about "running" and "ready", and the `pg_isready` example.
- **Read:** [Networking in Compose](https://docs.docker.com/compose/how-tos/networking/) - service names, and `HOST_PORT` against `CONTAINER_PORT`.
- **Read:** [Use Compose in production](https://docs.docker.com/compose/how-tos/production/) - the single server advice, and Swarm for more.

<details><summary>Go deeper (optional)</summary>

**More docs** (all opened 2026-11-13): [docker compose down](https://docs.docker.com/reference/cli/docker/compose/down/), [Volumes](https://docs.docker.com/engine/storage/volumes/), [Using profiles with Compose](https://docs.docker.com/compose/how-tos/profiles/), [Use Compose Watch](https://docs.docker.com/compose/how-tos/file-watch/), [Set environment variables](https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/), [Services reference](https://docs.docker.com/reference/compose-file/services/), [Version and name top-level elements](https://docs.docker.com/reference/compose-file/version-and-name/).

**The start order is not always one by one.** Compose starts services in dependency order, but services that do not depend on each other start together. In my runs db and cache started at the same time. The practice function `startOrder` gives one valid order, not the exact timing.

**The Postgres image and `pg_isready`.** On the first start, the image runs a temporary server during setup (visible in the logs: it starts, then "received fast shutdown request", then the real server starts). I did not manage to catch a healthcheck passing inside that short window in my test (it lasts about 100 ms), so I cannot say whether it can happen. If your web service ever connects and then loses the connection on a first start, look here first.

**Compose names.** My project name was `lesson03`, so containers were `lesson03-web-1`. The `-1` is the replica number. Compose can also run several copies of a service, but only on one machine.

**Link to lesson 02.** The `build: ./app` line builds an image from a Dockerfile, the same layers and cache you learned there. `image:` pulls a ready image.

**Link to lesson 04.** In Kubernetes the same ideas have other names: a Service gives a stable name like `db`, a readiness probe is the healthcheck, a PersistentVolumeClaim is the volume. See the [orchestration guide](container-orchestration-guide.md).

</details>

## 10. Practice

**A. Predict the output** (write your answer before opening)

```js
const services = { web: { depends_on: ["db", "cache"] }, db: {}, cache: {} };
console.log(startOrder(services));
console.log(canStart("service_started", { state: "running", health: "starting", exitCode: null }));
console.log(webStartsAt({ condition: "service_healthy", dbStartedAt: 0, dbReadyAt: 2001, interval: 2000 }));
```

<details><summary>Answer</summary>

```
[ 'db', 'cache', 'web' ]
true
4000
```

db and cache come first because web needs them. `service_started` only asks if db is running, and it is, so it prints `true` even though the health is still `starting`. The checks run at 2000 and 4000. Postgres is ready at 2001, so the check at 2000 is too early and web starts at 4000. (Checked on 2026-11-13 with Node 26.12.1.)

</details>

**B. Fix the bug**

This file runs on a fresh laptop. What goes wrong, and why? There are two bugs. Fix both.

```yaml
services:
  web:
    build: ./app
    environment:
      DATABASE_URL: postgres://postgres:secret@localhost:5432/postgres
    depends_on:
      - db
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_PASSWORD: secret
```

<details><summary>Answer</summary>

**Bug 1:** `localhost` inside web is web itself. It fails with `ECONNREFUSED` every time, even when the database is long ready (I ran this exact change). Use `db`.

**Bug 2:** `depends_on: [db]` means `service_started`. On a fresh volume the first connection can arrive before Postgres is ready. Add a healthcheck and `condition: service_healthy`.

```yaml
services:
  web:
    build: ./app
    environment:
      DATABASE_URL: postgres://postgres:secret@db:5432/postgres
    depends_on:
      db:
        condition: service_healthy
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_PASSWORD: secret
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 2s
      timeout: 3s
      retries: 10
```

Bonus: the database files should also be on a named volume, or `down` loses them (card 4). (Checked on 2026-11-13: the `localhost` version failed with `ECONNREFUSED`, and the fixed version started.)

</details>

**C. Write it yourself**

Open `learn/devops-cloud/practice/03-docker-compose.js`. It has six empty pieces: `startOrder`, `canStart`, `webStartsAt`, `connectResult`, `resolve` and `dataSurvives`. Write them, then run this from the repo root and make all the tests pass:

```
node --test learn/devops-cloud/practice/03-docker-compose.test.js
```

<details><summary>One possible answer</summary>

```js
function needs(service) {
  const d = service.depends_on || [];
  return Array.isArray(d) ? d : Object.keys(d);          // the short form is a list, the long form is an object
}

function startOrder(services) {
  const order = [];
  const done = new Set();
  const path = [];                                       // the services we are in the middle of, to find a cycle

  function visit(name) {
    if (done.has(name)) return;
    if (path.includes(name)) throw new Error("cycle: " + [...path.slice(path.indexOf(name)), name].join(" -> "));
    path.push(name);
    for (const dep of needs(services[name])) {
      if (!(dep in services)) throw new Error("unknown service: " + dep);
      visit(dep);                                        // what it needs goes into the list first
    }
    path.pop();
    done.add(name);
    order.push(name);
  }

  for (const name of Object.keys(services)) visit(name);
  return order;
}

function canStart(condition, dep) {
  switch (condition || "service_started") {
    case "service_started":
      return dep.state === "running";                    // running is enough, ready is not asked
    case "service_healthy":
      if (dep.health === "none") throw new Error("no healthcheck configured");
      return dep.state === "running" && dep.health === "healthy";
    case "service_completed_successfully":
      return dep.state === "exited" && dep.exitCode === 0;
    default:
      throw new Error("unknown condition: " + condition);
  }
}

function webStartsAt({ condition, dbStartedAt, dbReadyAt, interval }) {
  if (condition === "service_started") return dbStartedAt;
  if (condition === "service_healthy") {
    let check = dbStartedAt + interval;                  // the first check comes one interval after the start
    while (check < dbReadyAt) check += interval;         // keep checking until one is at or after the ready time
    return check;
  }
  throw new Error("unknown condition: " + condition);
}

function connectResult(startsAt, dbReadyAt) {
  return startsAt >= dbReadyAt ? "connected" : "ECONNREFUSED";
}

function networksOf(service) {
  return service.networks && service.networks.length ? service.networks : ["default"];
}

function resolve(services, from, hostname) {
  if (hostname === "localhost") return from;             // localhost is always the container you are in
  if (!services[from] || !services[hostname]) return null;
  const mine = networksOf(services[from]);
  return networksOf(services[hostname]).some((n) => mine.includes(n)) ? hostname : null;
}

function dataSurvives(command, mount) {
  if (!["stop", "down", "down -v"].includes(command)) throw new Error("unknown command: " + command);
  if (!["layer", "named", "bind"].includes(mount)) throw new Error("unknown mount: " + mount);
  if (mount === "bind") return true;                     // a host folder is never removed by Compose
  if (mount === "named") return command !== "down -v";   // only -v removes a named volume
  return command === "stop";                             // the container's own storage goes with the container
}

module.exports = { startOrder, canStart, webStartsAt, connectResult, resolve, dataSurvives };
```

Checked on 2026-11-13 with Node 26.12.1: the 31 tests fail on the empty stub and all 31 pass with this answer. I also broke the answer in 13 small ways (for example `down -v` keeping the volume, or checking `>` instead of `>=`), and each one made at least one test fail.

</details>

## 11. Interview question

**Q:** "Your web service in Docker Compose crashes on the first start with 'connection refused' to Postgres, but works when you run it again. Why, and how do you fix it? And what happens to the data on `docker compose down`?"

A common follow-up: "When would you not use Compose?" Card 1 is the answer.

<details><summary>A strong answer, in four parts</summary>

1. **Problem:** `depends_on` only waits until the database container is **running**. Postgres needs a moment after that to build its files, so web's first connection can be refused. On the second run Postgres starts faster, so it works. It is a timing bug.
2. **How it works:** I add a `healthcheck` to the db service (`pg_isready` every few seconds), and I write `condition: service_healthy` in web's `depends_on`. Compose then keeps web waiting until the check passes. I still add a retry in the app, because a database can restart later. Services reach each other by service name (`db:5432`), never `localhost`. Data lives on a named volume, so `docker compose down` keeps it and only `down -v` deletes it.
3. **Tradeoff:** The healthcheck adds up to one interval of waiting at start (about 2 seconds in my test). A retry hides the order and fills the logs. Compose is simple, but it controls one machine only: no self healing, no rolling update across servers. For that I would move to Swarm or Kubernetes.
4. **My example:**
   - **Fact (your profile):** you work with Express, Prisma and PostgreSQL, and you use Docker and CapRover.
   - **Fact (checked):** CapRover is built on Docker Swarm, per its site and the internals guide in this repo. That is the next rung above Compose.
   - **Idea, not a fact:** a local `compose.yaml` with your Express API, Postgres on a named volume with a healthcheck, and Redis, plus a one-shot `migrate` service for Prisma using `service_completed_successfully`. I tested that condition with a `psql` job, not with Prisma. I did not check whether DBO, Unloan or ZWS have a compose file, so do not say they do.

</details>

## 12. Explain it back

Close this file. Explain Docker Compose out loud like to a new junior, in 4 parts (problem, how, tradeoff, my example). Use the story of the web service that crashed on the first start with `ECONNREFUSED`, and the three rows that survived `down` but not `down -v`. Then write your best version below and run `/explain-check docker compose` or ask the `explain-coach` agent to review it.

### My explanation

<write here>

### Coach feedback

<the explain-coach agent writes here>

## 13. Review questions (day 1, 3, 7, 21)

1. Web crashed with `ECONNREFUSED` on the first start, but Postgres was fine a second later. Why did Compose start web too early, and what are two fixes?
2. In the web container, what host name and port do you use to reach db, and why does `localhost:5432` fail?
3. A database on a named volume has 3 rows. What do the rows look like after `down` then `up`, and after `down -v` then `up`?

Then draw from memory: your laptop, the web container, the db container, the volume, the two ports (host and container), and the name web uses to find db.

<details><summary>Answers</summary>

1. `depends_on` with no condition means `service_started`: Compose waits until the container is running, not until Postgres can take connections. Fixes: a `healthcheck` on db with `condition: service_healthy` on web, and a retry in the app (or `restart: on-failure`).
2. Use `db:5432`: the service name, and the container port. `localhost` inside web is the web container itself, and nothing listens on 5432 there.
3. After `down` then `up` there are still 3 rows, because `down` keeps named volumes. After `down -v` then `up` there are 0 rows, because `-v` deletes the volume.

</details>

## Connected lessons

- [Docker images and layers](02-docker-images-and-layers.md) - the lesson before. `build:` in a Compose file builds the image you learned about there.
- [Kubernetes objects](04-kubernetes-objects.md) - the next lesson. Compose runs one machine. Kubernetes runs many, with names, health probes and volumes of its own.
- [Docker and CapRover internals](docker-caprover-internals.md) - networks, volumes and the Swarm ladder under the tools you use.
- [Containers: Docker, CapRover to Kubernetes](container-orchestration-guide.md) - the whole ladder from one container to Kubernetes.
- [Timeouts, retries and circuit breakers](../system-design/23-timeouts-retries-and-circuit-breakers.md) - the retry in the app is the same idea as a retry between services.
- [Connection pooling](../database/20-connection-pooling.md) - the connection your web service opens to Postgres in this lesson.
