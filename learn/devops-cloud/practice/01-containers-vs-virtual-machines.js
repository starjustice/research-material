// Lesson 01: Containers vs virtual machines. Write the six pieces below, then run:
//   node --test learn/devops-cloud/practice/01-containers-vs-virtual-machines.test.js

//   memoryLimitBytes(text)
//       Turn a Docker memory flag into bytes, like the number in the cgroup file memory.max.
//       "64m" gives 67108864. The units are k, m and g (1024 based, any case, an extra b is fine:
//       "64MB" is the same as "64m"). A plain number such as "100" is bytes.
//       Throw an Error for text that is not a size, such as "abc", "" or "12x".
//
//   runResult({ limit, usedMiB })
//       A container starts with the memory limit "limit" (text, like "64m") and its program
//       tries to use usedMiB megabytes (1 MiB is 1048576 bytes).
//       If the program uses MORE than the limit, the kernel kills it: return
//       { killed: true, exitCode: 137 }.  (137 is 128 plus signal 9, SIGKILL.)
//       Otherwise return { killed: false, exitCode: 0 }.
//
//   namespacesSeen(flags)
//       flags is a list of docker run flags, for example ["--memory=64m", "--pid=host"].
//       Return what the container sees: an object with the keys mnt, pid, net, uts and ipc.
//       Each value is "own" (the container gets its own copy) or "host" (it shares the host's).
//       Everything starts as "own". These flags change one key to "host":
//         --pid=host   pid        --network=host (or --net=host)   net
//         --uts=host   uts        --ipc=host   ipc
//       Any other flag changes nothing. The mount view (mnt) is always "own".
//
//   whichFeature(want)
//       Say which kernel feature gives you what you want. Return { kind, name }.
//         "own process numbers"   { kind: "namespace", name: "pid" }
//         "own hostname"          { kind: "namespace", name: "uts" }
//         "own network ports"     { kind: "namespace", name: "net" }
//         "own filesystem view"   { kind: "namespace", name: "mnt" }
//         "memory limit"          { kind: "cgroup", name: "memory" }
//         "cpu limit"             { kind: "cgroup", name: "cpu" }
//         "process count limit"   { kind: "cgroup", name: "pids" }
//       Throw an Error for anything else.
//
//   compareCosts(container, vm, count)
//       container and vm look like { startMs: 230, memoryMiB: 0.5 }. count is how many you start.
//       Return an object with:
//         totalStartMs   { container, vm }  the start time of count of them, one after the other
//         totalMemoryMiB { container, vm }  the memory of count of them
//         startRatio     vm.startMs / container.startMs, rounded to 1 decimal
//         memoryRatio    vm.memoryMiB / container.memoryMiB, rounded to 1 decimal
//
//   chooseIsolation({ needsOtherKernel, runsUntrustedCode, startsOften })
//       Return "vm", "microvm" or "container".
//       needsOtherKernel (the app needs a kernel that is not the host's)  -> "vm"
//       else runsUntrustedCode and startsOften (many short lives)         -> "microvm"
//       else runsUntrustedCode                                            -> "vm"
//       else                                                              -> "container"

function memoryLimitBytes(text) {
  // TODO
}

function runResult({ limit, usedMiB }) {
  // TODO
}

function namespacesSeen(flags) {
  // TODO
}

function whichFeature(want) {
  // TODO
}

function compareCosts(container, vm, count) {
  // TODO
}

function chooseIsolation({ needsOtherKernel, runsUntrustedCode, startsOften }) {
  // TODO
}

module.exports = { memoryLimitBytes, runResult, namespacesSeen, whichFeature, compareCosts, chooseIsolation };
