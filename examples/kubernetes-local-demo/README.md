# Kubernetes Local Lab — a real cluster on your laptop in ~20 minutes

- **Written:** 2026-07-28
- **For:** an engineer who ships Docker containers (CapRover / Docker Swarm) and has never run Kubernetes.
- **Cost:** zero. No cloud account. Everything runs in Docker on your machine.
- **Companion note:** [`../../notes/container-orchestration-guide.md`](../../notes/container-orchestration-guide.md)

By the end you will have honestly done all of this:

- [ ] Created a real 3-node Kubernetes cluster
- [ ] Deployed an app declaratively from YAML files
- [ ] Watched the scheduler place pods on different nodes
- [ ] Reached the app in your browser through a Service
- [ ] Scaled it up and down
- [ ] Deleted a pod and watched Kubernetes replace it
- [ ] Killed a container and watched kubelet restart it
- [ ] Run a zero-downtime rolling update while watching live traffic
- [ ] Shipped a broken release, seen the rollout stall safely, and rolled back
- [ ] Learned that changing a ConfigMap does **not** restart pods
- [ ] Seen OOMKilled with your own eyes
- [ ] Deleted the whole cluster with one command

That is enough to say in an interview: *"I have run Kubernetes locally with kind — deployments, services, probes, rolling updates, and rollbacks."* It is not production experience, and you should not call it that.

---

## 0. Prerequisites

You need three things.

**1. Docker must be running.** kind runs each Kubernetes node as a Docker container. Docker Desktop, Colima, or Podman all work. Check:

```bash
docker ps
```

Give Docker at least 4 GB of memory (Docker Desktop → Settings → Resources).

**2. kubectl** — the command-line client that talks to the Kubernetes API server.

```bash
brew install kubectl
kubectl version --client
```

**3. kind** — "Kubernetes IN Docker". It creates a real cluster using Docker containers as nodes. Current version is v0.32.0 (July 2026), which ships node images for Kubernetes v1.33 through v1.36.

```bash
brew install kind
kind version
```

No Homebrew? Download the binary:

```bash
[ "$(uname -m)" = arm64 ] && curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.32.0/kind-darwin-arm64
chmod +x ./kind && sudo mv ./kind /usr/local/bin/kind
```

**Why kind and not minikube?** kind starts faster, uses the Docker you already have, and creates multi-node clusters trivially. Both are fine; kind is the one CI systems use.

---

## 1. Create the cluster

```bash
cd examples/kubernetes-local-demo
kind create cluster --config kind-config.yaml
```

First run downloads a node image (about 1 GB) and takes a few minutes. After that it is under a minute.

**What just happened:** kind started 3 Docker containers. One is the **control plane** (API server, scheduler, controllers, etcd). Two are **worker nodes** (kubelet, container runtime, kube-proxy). It also wrote cluster credentials into `~/.kube/config` and switched your `kubectl` to point at them.

Check which cluster kubectl is talking to — always do this before running commands:

```bash
kubectl config current-context     # expect: kind-orchestration-lab
kubectl get nodes -o wide
```

You should see 3 nodes with STATUS `Ready`.

See what Kubernetes runs for itself:

```bash
kubectl get pods -A
```

`-A` means all namespaces. The `kube-system` namespace holds the cluster's own parts: CoreDNS (internal DNS), kube-proxy (one per node — that is a DaemonSet), and the control-plane components. Looking at this once makes the architecture concrete.

---

## 2. Deploy the app

Three files, applied in order. Read each file before applying it — they are commented line by line.

```bash
kubectl apply -f configmap.yaml     # the app's content (an index.html)
kubectl apply -f deployment.yaml    # 2 pods, probes, resource limits
kubectl apply -f service.yaml       # stable address in front of the pods
```

`apply` is **declarative**: you are not saying "start a container", you are saying "this is what should exist". Run any of these commands twice — nothing changes. That property is called idempotent, and it is the core difference from `docker run`.

Watch the pods start:

```bash
kubectl get pods -o wide -w
```

`-w` watches for changes. Press Ctrl+C when both pods show `1/1 Running`.

**Three things to notice in that output:**

1. The `NODE` column — the scheduler spread your 2 pods across the worker nodes without being told to. (Nothing lands on the control-plane node: it carries a taint that repels normal workloads.)
2. Pod names look like `web-6f7c9d5b7-x2k9p`: `<deployment>-<replicaset hash>-<random>`. The middle part identifies the ReplicaSet, which is how rollbacks work.
3. `READY 0/1` for a couple of seconds before `1/1` — that is the **readiness probe** passing. Until it passes, the pod gets no traffic.

Look at the whole chain you just created:

```bash
kubectl get deploy,rs,pods,svc
```

Deployment → ReplicaSet → Pods, plus the Service. You wrote only the Deployment; Kubernetes created the ReplicaSet and the pods.

---

## 3. Open it in a browser

```bash
open http://localhost:8080
```

You should see **VERSION 1** on a blue page.

**How the request reached the pod:** browser → `localhost:8080` on your Mac → kind's port mapping → node port `30080` inside the cluster → the `web-svc` Service → one of the ready pods.

The other way to reach anything, which works with no NodePort and no ingress at all:

```bash
kubectl port-forward svc/web-svc 9090:80
# then: open http://localhost:9090   (Ctrl+C to stop)
```

`port-forward` is the tool you will use constantly for debugging, because it works against any Service or pod in any cluster you have access to.

> **Why this lab does not use an Ingress.** `ingress-nginx` — the controller nearly every tutorial installs — was **retired by the Kubernetes project on 31 March 2026**: no releases, no security patches. The replacement direction is the Gateway API, which needs a controller install and more YAML. For a first lab, NodePort plus `port-forward` gives a working result with the least friction, and the concept you need for interviews (Ingress = HTTP routing rules, Ingress controller = the proxy enforcing them) is covered in the study note.

---

## 4. Scale it

```bash
kubectl scale deployment/web --replicas=5
kubectl get pods -o wide
```

Five pods, spread across the nodes. Now scale back:

```bash
kubectl scale deployment/web --replicas=2
```

**What to notice:** you never said which machine. You said "how many". That is the whole idea of orchestration.

**Honest note:** `kubectl scale` is imperative and will be undone the next time someone applies the YAML. In real life the replica count lives in the file (or an HPA manages it). Try it: change `replicas: 2` to `replicas: 4` in `deployment.yaml`, then `kubectl apply -f deployment.yaml`.

---

## 5. Break things and watch them heal

### 5a. Delete a pod (self-healing at the ReplicaSet level)

In terminal 1, watch:

```bash
kubectl get pods -w
```

In terminal 2, delete exactly one pod:

```bash
POD=$(kubectl get pod -l app=web -o jsonpath='{.items[0].metadata.name}')
echo "deleting $POD"
kubectl delete pod "$POD"
```

**What to observe:** the pod terminates and a **new pod with a new name** appears within seconds. The ReplicaSet noticed that actual state (1 pod) did not match desired state (2 pods) and fixed it. Nothing was repaired — it was replaced. Pods are disposable.

### 5b. Kill the process inside a container (self-healing at the kubelet level)

```bash
POD=$(kubectl get pod -l app=web -o jsonpath='{.items[0].metadata.name}')
kubectl exec "$POD" -- kill 1        # PID 1 inside the container is nginx
kubectl get pod "$POD"
```

**What to observe:** the pod name stays the same, but `RESTARTS` becomes `1`. The container was restarted in place by the kubelet on that node. Different mechanism from 5a — be able to explain the difference: 5a replaced a **pod**, 5b restarted a **container** inside an existing pod.

See why it restarted:

```bash
kubectl describe pod "$POD" | tail -20     # the Events section
kubectl logs "$POD" --previous             # logs of the container that just died
```

`kubectl logs --previous` is the single most useful debugging command in Kubernetes and the one people forget.

---

## 6. Zero-downtime rolling update

Start a traffic monitor in **terminal 1** and leave it running:

```bash
while true; do
  printf "%s  %s\n" "$(date +%T)" "$(curl -s --max-time 2 http://localhost:8080 | grep -o 'VERSION [0-9]' || echo '*** FAILED ***')"
  sleep 0.3
done
```

In **terminal 2**, deploy version 2. It changes the image tag (`nginx:1.27-alpine` → `nginx:1.29-alpine`) and the mounted ConfigMap (`site-v1` → `site-v2`):

```bash
kubectl apply -f deployment-v2.yaml
kubectl rollout status deployment/web
```

**What to observe in terminal 1:** the output flips from `VERSION 1` to `VERSION 2` and **never prints `FAILED`**. That is zero downtime, and it comes from two settings working together:

- `maxUnavailable: 0` — never drop below the desired number of healthy pods.
- the `readinessProbe` — a new pod joins the Service only after it answers correctly, and an old pod leaves the Service before it is stopped.

Watch the machinery:

```bash
kubectl get rs                    # old ReplicaSet scaled to 0, new one to 2
kubectl rollout history deployment/web
```

The old ReplicaSet still exists with 0 pods. That is what makes rollback instant.

---

## 7. Ship a broken release, then roll back

This is the most valuable 3 minutes of the lab. Keep the traffic monitor running.

```bash
kubectl apply -f deployment-broken.yaml
kubectl rollout status deployment/web        # this will hang — that is correct. Ctrl+C after ~30s
```

In another terminal:

```bash
kubectl get pods
kubectl describe pod -l version=v3-broken | grep -A5 Events
```

**What to observe:**

- A new pod exists but stays at `READY 0/1` forever. Its readiness probe asks for a path nginx does not serve, so nginx answers 404 and the probe fails.
- The Events section says `Readiness probe failed: HTTP probe failed with statuscode: 404`.
- **Terminal 1 still shows `VERSION 2` with no failures.** The old pods were never removed, because the new one never became ready.

The rollout is stuck, not broken. Now undo it:

```bash
kubectl rollout undo deployment/web
kubectl rollout status deployment/web
kubectl get pods
```

Back to version 2 in seconds, because the old ReplicaSet was still there.

**The interview sentence this earns you:** *"A readiness probe plus `maxUnavailable: 0` means a bad release stalls instead of taking the site down, and `kubectl rollout undo` reverses it in seconds because the previous ReplicaSet is still there."*

---

## 8. The ConfigMap trap

Edit `configmap.yaml` and change `VERSION 2` to `VERSION 2 EDITED` in the `site-v2` ConfigMap. Then:

```bash
kubectl apply -f configmap.yaml
kubectl get pods            # nothing restarts
curl -s http://localhost:8080 | grep VERSION
```

Because this ConfigMap is mounted as a **file**, the change does eventually appear inside the pod (kubelet refreshes mounted ConfigMaps roughly every minute), but **the container is never restarted**. If you had injected the value as an **environment variable** instead, the running process would never see the new value at all — environment variables are read once at process start.

Force a restart the correct way:

```bash
kubectl rollout restart deployment/web
kubectl rollout status deployment/web
```

**Why this matters:** "I changed the config and nothing happened" is a real production incident pattern. `kubectl rollout restart` is the fix, and tools like Reloader automate it.

---

## 9. See OOMKilled with your own eyes

Memory over the limit is not throttled. It is killed instantly.

Set both the request and the limit to a value nginx cannot live in (the limit must not be lower than the request, or the API server rejects it):

```bash
kubectl set resources deployment/web --requests=memory=4Mi --limits=memory=4Mi
kubectl get pods -w        # Ctrl+C after you see restarts
```

Check the reason:

```bash
kubectl describe pod -l app=web | grep -i -B2 -A6 "last state"
```

Look for `Reason: OOMKilled` and `Exit Code: 137`. **Remember 137 = out of memory.** If nginx somehow survives, drop it to `2Mi` and try again.

Put it back:

```bash
kubectl set resources deployment/web --requests=memory=32Mi --limits=memory=64Mi
kubectl rollout status deployment/web
```

**Contrast to state in an interview:** a container over its **memory** limit is killed (exit 137). A container over its **CPU** limit is only slowed down — no crash, no error log, just mysterious p99 latency.

---

## 10. Clean up

```bash
kind delete cluster --name orchestration-lab
```

One command, everything gone — the nodes were only Docker containers. This is why kind is safe to experiment with.

---

## What each piece maps to in your CapRover setup

| In this lab | In your CapRover / Swarm world |
|---|---|
| `kind create cluster` | `caprover setup` initialising Docker Swarm on the VPS |
| Deployment | A CapRover app = a Docker Swarm service |
| `replicas: 2` | The "instance count" field in CapRover |
| Service (`web-svc`) | Swarm's internal DNS name plus its virtual IP |
| NodePort / port mapping | CapRover's nginx publishing an app on a domain |
| ConfigMap and Secret | CapRover per-app environment variables |
| readiness + liveness probes | Your container health check, split into two signals |
| Rolling update with `maxSurge`/`maxUnavailable` | CapRover's rolling deploy, but you control the pace |
| `kubectl rollout undo` | CapRover's "revert to previous version" |
| `kubectl logs --previous` | `docker service logs` after a crash |

## Where to go next in this lab

- Add a second Deployment (`api`) and call it from another pod by Service name: `kubectl run tmp --rm -it --image=curlimages/curl -- curl http://web-svc`. That demonstrates internal service discovery through cluster DNS.
- Install `metrics-server`, add an HPA, generate load, and watch pods multiply.
- Create a `CronJob` printing the date every minute — the Kubernetes replacement for your separate Cron service container.
- Write a tiny Helm chart wrapping these files, and install it twice with different values into two namespaces.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `kind create cluster` hangs or fails | Docker is not running, or has too little memory. Give Docker 4 GB+ |
| `localhost:8080` refuses connection | The cluster was created without `--config kind-config.yaml`. Delete and recreate it |
| Pod stuck `Pending` | No node has room for the requested CPU/memory, or a volume cannot be bound. `kubectl describe pod` explains it |
| Pod stuck `ImagePullBackOff` | Wrong image name or tag, or no internet. `kubectl describe pod` shows the pull error |
| `kubectl` talks to the wrong cluster | `kubectl config get-contexts`, then `kubectl config use-context kind-orchestration-lab` |
| Everything looks broken | `kind delete cluster --name orchestration-lab` and start again. It costs 60 seconds |
