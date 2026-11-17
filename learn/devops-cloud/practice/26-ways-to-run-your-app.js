// Lesson 26: Ways to run your app compared. Do the three tasks below, then run:
//   node --test learn/devops-cloud/practice/26-ways-to-run-your-app.test.js

// Given to you: the AWS Lambda limits from the lesson (checked 2026-11-17 in the AWS docs).
const LAMBDA = {
  maxSeconds: 900,        // one call may run up to 15 minutes
  maxMemoryMb: 10240,     // up to 10,240 MB of memory
  maxResponseMb: 6,       // a normal (synchronous) call may send back up to 6 MB
};

// 1. WRITE IT: lambdaFits(job)  returns an array of problems.
//    job is { durationSeconds, memoryMb, responseMb }.
//    Add "too long"         when durationSeconds is more than LAMBDA.maxSeconds
//    Add "too much memory"  when memoryMb is more than LAMBDA.maxMemoryMb
//    Add "response too big" when responseMb is more than LAMBDA.maxResponseMb
//    Equal to the limit is fine. Keep the order above. An empty array means it fits.
function lambdaFits(job) {
  // TODO
}

// 2. WRITE IT: reconcile(desired, running)
//    Compose does not do this, but Swarm (CapRover), ECS and Kubernetes all keep a number of copies alive.
//    Return { start, stop }: how many copies to start, and how many to stop, to reach the desired count.
//    Neither number is ever negative. A desired count below 0 counts as 0.
function reconcile(desired, running) {
  // TODO
}

// 3. THINK: for each situation write one word: "compose", "caprover", "fargate", "kubernetes" or "lambda".
const choices = {
  twoServicesOnOneSmallServerNeverScales: "",      // the simplest thing that works
  fiveServicesOnMyOwnServerWantADashboardAndHttps: "", // a self-hosted platform you already know
  awsOnlyTeamWantsContainersAndNoServersToPatch: "",   // containers, but AWS looks after the machines
  manyTeamsManyServicesNeedOneStandardTool: "",        // a big system with a lot of moving parts
  resizeAnImageWhenAFileIsUploadedAFewTimesADay: "",   // short, rare, event driven work
};

module.exports = { LAMBDA, lambdaFits, reconcile, choices };
