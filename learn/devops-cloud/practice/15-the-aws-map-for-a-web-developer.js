// Lesson 15: The AWS map for a web developer. Write the six pieces below, then run:
//   node --test learn/devops-cloud/practice/15-the-aws-map-for-a-web-developer.test.js
//
// This is a tiny model. It uses plain JavaScript and no AWS account. The numbers are made up for practice.
// Do not change the inputs you are given. Return new values.

// 1. cdnGet(cache, path, now, ttlSeconds)     a CDN (CloudFront) remembers copies near the users
//    cache is { [path]: { storedAt } } with times in seconds. now is the time of this request in seconds.
//    Return { from, cache }:
//      from is "edge"    when the path is in the cache and (now - storedAt) is LESS than ttlSeconds
//      from is "origin"  otherwise (not in the cache, or the copy is too old)
//    The returned cache is a NEW object.
//      On "edge" it holds the same entries as before.
//      On "origin" it also holds this path with storedAt = now (a fresh copy).
function cdnGet(cache, path, now, ttlSeconds) {
  // TODO
}

// 2. checkPresigned(link, request)             a presigned S3 link allows one thing, for a short time
//    link is { key, method, expiresAt } (times in seconds).  request is { key, method, now }.
//    Return { ok: true } when the request is allowed.
//    Otherwise return { ok: false, reason } with the FIRST problem found, checked in this order:
//      "expired"       when request.now is later than link.expiresAt (exactly equal is still fine)
//      "wrong key"     when the request key is not the link key
//      "wrong method"  when the request method is not the link method
function checkPresigned(link, request) {
  // TODO
}

// 3. dbConnections(parallelCalls, proxyPool)   how many connections reach the database
//    parallelCalls: how many Lambda calls run at the same moment (a negative number counts as 0).
//    proxyPool: null when there is NO proxy, or a number: the most connections a proxy keeps open.
//    With no proxy, every call opens its own connection.
//    With a proxy, the calls share its pool, so never more than proxyPool connections reach the database.
//    Return the number of connections to the database.
function dbConnections(parallelCalls, proxyPool) {
  // TODO
}

// 4. pickCompute(job)                          which place runs this code?
//    job is { needsFullControl, maxMinutes, traffic }.
//      needsFullControl: true when you must pick the machine or put your own software on it (for example a GPU)
//      maxMinutes: the longest one run can take
//      traffic: "steady", "spiky" or "rare"
//    Return "ec2", "fargate" or "lambda". Check the rules in this order:
//      needs full control        -> "ec2"
//      a run longer than 15 min  -> "fargate"   (exactly 15 is fine for Lambda)
//      steady traffic            -> "fargate"
//      anything else             -> "lambda"
function pickCompute(job) {
  // TODO
}

// 5. reviewSetup(setup)                        find the classic mistakes. Return a list of problem texts.
//    setup is { compute, databasePublic, uploadsOn, dbProxy, secretsInCode }
//      compute: "ec2", "fargate" or "lambda".   databasePublic: true or false
//      uploadsOn: "server-disk" or "s3".        dbProxy: true or false.   secretsInCode: true or false
//    The app uses a Postgres database. Add these texts, exactly as written, in this order:
//      "database is open to the internet"                           when databasePublic is true
//      "uploads are on the server disk"                             when uploadsOn is "server-disk"
//      "lambda without a proxy may use up database connections"     when compute is "lambda" and dbProxy is not true
//      "secrets are in the code"                                    when secretsInCode is true
//    An empty list means no problem was found.
function reviewSetup(setup) {
  // TODO
}

// 6. THINK: for each job write one word: "route53", "cloudfront", "s3", "rds", "fargate", "lambda" or "load-balancer".
const where = {
  theNameShopExampleComMustFindYourSite: "",           // turns a name into an address
  copiesOfImagesKeptCloseToTheUsers: "",               // a CDN
  profilePhotosThatUsersUpload: "",                    // files, not a disk
  theOrdersTablesInPostgres: "",                       // a database that AWS looks after
  theExpressApiInAContainerWithNoServersToPatch: "",   // containers, no machines to look after
  aThirtySecondJobThatRunsOnceAnHour: "",              // short and rare
  sharingRequestsBetweenSeveralCopiesOfTheApi: "",     // one front door for many copies
};

module.exports = { cdnGet, checkPresigned, dbConnections, pickCompute, reviewSetup, where };
