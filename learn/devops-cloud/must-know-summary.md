# DevOps and cloud: what to know first

**Written:** 2026-11-25 · **For:** Software Engineer and Senior Software Engineer interviews · **Your stack:** Docker, CapRover, AWS (light experience)

This page is a short map of the 20 DevOps and cloud lessons that exist today. It tells you which ones to learn first and gives you the sentence to say out loud. If a lesson feels hard, read the line here first, then open the lesson.

**How to read the stars.** This is my judgement of how often a full stack engineer gets asked each topic. DevOps is usually a smaller part of the interview, so start with ★★★ and stop there if time is short.

- ★★★ Often asked, even for non-DevOps roles. Learn these first.
- ★★ Asked in senior rounds or when the job uses it.
- ★ Only if the job needs it, or for depth.

## ★★★ Learn these first

| Lesson | Say this in the interview | Common trap |
|---|---|---|
| [01 Containers vs VMs](01-containers-vs-virtual-machines.md) | A VM has its own kernel. A container is a normal process that shares the host's kernel. Namespaces decide what it sees, cgroups decide how much it uses. | A container is not a strong security boundary, because the kernel is shared. Over the memory limit the process is killed (exit 137). |
| [02 Docker images and layers](02-docker-images-and-layers.md) | An image is read-only layers. Docker re-runs from the first changed line. Copy the library list before the source code, and use a multi-stage build to ship a small image. | Deleting a file in a later line hides it but the bytes stay in the image. |
| [05 CI/CD pipelines](05-ci-cd-pipelines.md) | A pipeline runs the same steps on a clean machine after every push. Cheap checks go first. Build once, tag with the commit id. A rollback is a deploy of an older tag. | Know the difference: CI tests every push, delivery waits for a person, deployment goes all the way by itself. |
| [09 Config and secrets](09-config-and-secrets.md) | Build once. Give each place its own settings from outside the code. Never commit a real secret. | A secret in an image layer or `ARG` ships with the image. If it leaked, change the secret. `NEXT_PUBLIC_` values are public. |
| [06 Cloud models](06-cloud-models.md) | IaaS, PaaS and SaaS say who looks after which layer. Public, private and hybrid say whose buildings. They are two separate questions. | CapRover is "PaaS-like", but you still own the OS and the server. |
| [15 The AWS map](15-the-aws-map-for-a-web-developer.md) | A web app is six small jobs, and each has an AWS service: S3 files, RDS Postgres, Route 53 DNS, CloudFront CDN, a load balancer, and compute (EC2, ECS, Lambda). | Keep files in S3, not on a server disk. RDS does backups and patches, but you still own schema and indexes. |

## ★★ Learn these second

| Lesson | Say this in the interview | Common trap |
|---|---|---|
| [03 Docker Compose](03-docker-compose.md) | One file describes the whole app on one machine. Inside Compose, the host name is the service name. | `localhost` is only yourself. `depends_on` means "started", not "ready". `down -v` deletes your data. |
| [04 Kubernetes objects](04-kubernetes-objects.md) | You write what you want. Loops keep reality equal to it. You write a Deployment, not pods. A Service picks ready pods by label. | A pod is disposable. A label that matches nothing means no traffic. |
| [07 Serverless](07-serverless.md) | You pay for work, not for being on. The first call on a new copy is cold. A function has a time limit and no memory between calls. | Keep anything that must last in a database, cache or file storage. |
| [10 Logs and monitoring](10-logs-and-monitoring.md) | The app prints to stdout. One JSON line per event, with a level and a request id. Alert on what users feel. | The default Docker log driver never rotates and can fill the disk. |
| [17 VPC networking](17-vpc-networking-basics.md) | Only the load balancer faces the internet. App and database live in private subnets. A public subnet has a route to an internet gateway. | A security group only allows and remembers connections. A new group lets nothing in. |
| [19 HTTPS and certificates](19-https-and-certificates-in-practice.md) | A certificate proves who controls a name. TLS ends at the proxy (termination). ACME proves control with a file on port 80 or a DNS record. | A wildcard needs DNS-01. Know what happens when a certificate expires. |
| [20 Metrics and alerts](20-metrics-dashboards-and-alerts.md) | Counter, gauge, histogram. Never graph a raw counter, use `rate()`. Watch rate, errors and duration per service. | Never average percentiles. |
| [26 Ways to run your app](26-ways-to-run-your-app.md) | Pick by who looks after the machine, how much you want to learn, and the shape of your traffic. Lambda is for short, spiky work. | Do not choose by what sounds modern. |
| [08 Reverse proxy and Nginx](08-reverse-proxy-and-nginx.md) | `server_name` picks the site, `location` picks the path, `proxy_pass` picks the app. 502 means the apps did not answer. 504 means too slow. | Test with `nginx -t`, then reload. |

## ★ Depth, or only if the job needs it

| Lesson | The one idea |
|---|---|
| [11 Kubernetes probes and limits](11-kubernetes-probes-limits-and-rollouts.md) | Readiness decides who gets traffic. Liveness means "restart me". A request reserves room, a limit is the ceiling. |
| [14 Infrastructure as code](14-infrastructure-as-code.md) | Write what you want in files in Git. Plan shows, apply does. Keep state in a shared, locked place. |
| [21 What CapRover does](21-what-caprover-does-for-you.md) | CapRover is helper services plus your apps on Docker Swarm: build, run, route, certificate, renew. Good to know because it is in your own experience. |
| [22 Supply chain security](22-container-and-supply-chain-security.md) | Use layers of defence. Small base image, `USER node`, lockfile with `npm ci`, pin images by digest. |
| [24 Cloud cost](24-cloud-cost-basics.md) | Read the bill by line. Look for things that exist but do nothing, and for data that moves. |

## The 6 questions most likely to come up

1. "Container vs VM?" (01)
2. "Your Docker build is slow and the image is huge. Fix it." (02)
3. "Walk me through a CI/CD pipeline. How do you roll back?" (05)
4. "How do you handle secrets?" (09)
5. "How would you run this Next.js, Express and Postgres app on AWS?" (15, 17, 26)
6. "How do you know the app is healthy in production?" (10, 20)

## Practice

- Lessons have quizzes in `learn/devops-cloud/quiz/`.
- The longer guides are [cloud models and serverless](cloud-computing-models-serverless-guide.md) and [container orchestration](container-orchestration-guide.md).

## Honest notes

- This page only compresses the lessons' "Remember" lines. If it disagrees with a lesson, the lesson is right.
- Your experience is light here (Docker, CapRover, AWS). In an interview, say what you did, then say how you would learn the rest. Do not claim Kubernetes work you did not do.
