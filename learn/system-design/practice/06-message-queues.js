// Lesson 06: Message queues. Write createQueue below, then run:
//   node --test learn/system-design/practice/06-message-queues.test.js

// createQueue({ maxTries }) makes an in-memory queue. maxTries is how many times a job may be
// taken before it is parked. The default is 3. It returns an object with these methods:
//
//   push(payload)   adds a job to the end of the waiting line and returns its id.
//                   Ids are numbers: the first job gets 1, the second gets 2, and so on.
//
//   take()          a worker takes the job at the front of the waiting line.
//                   The job becomes hidden: no other take() can see it until it is acked or failed.
//                   It returns { id, payload, tries }, where tries counts how many times this
//                   job has been taken, including this time (1 the first time, 2 the second time).
//                   When the line is empty it returns null.
//
//   ack(id)         the worker finished. The job is deleted for good.
//                   It returns true. For an id that is not hidden (unknown, or already acked)
//                   it returns false and changes nothing.
//
//   fail(id)        the worker failed or crashed, so no ack arrived. The hidden job is not lost:
//                   - if tries is less than maxTries, it goes to the END of the waiting line
//                     and fail returns "retry";
//                   - if tries has reached maxTries, it goes to the dead letters
//                     and fail returns "dead".
//                   For an id that is not hidden, it returns false and changes nothing.
//
//   length()        how many jobs are waiting in the line. Hidden jobs are not counted.
//   heldCount()     how many jobs are hidden right now.
//   deadLetters()   an array of { id, payload, tries } for the parked jobs, oldest first.
function createQueue(options) {
  // TODO
}

module.exports = { createQueue };
