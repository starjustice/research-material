// Lesson 18: Object storage and presigned uploads. Write planMultipart and createUploads below, then run:
//   node --test learn/system-design/practice/18-object-storage-and-presigned-uploads.test.js

// planMultipart(sizeBytes) -> { mode, partSize, parts }
//
//   Sizes use MiB = 2 ** 20 bytes and GiB = 2 ** 30 bytes. These are the S3 limits from the lesson:
//   parts are 5 MiB to 5 GiB, and one upload has at most 10,000 parts.
//
//   - sizeBytes must be a whole number above 0, or throw a RangeError.
//   - A file bigger than 10,000 * 5 GiB (about 48.8 TiB) is too big: throw a RangeError.
//   - Up to and including 100 MiB: one request. Return { mode: "single", parts: 1, partSize: sizeBytes }.
//   - Above 100 MiB: many parts. Return { mode: "multipart", partSize, parts }.
//       partSize is the SMALLEST allowed size that keeps parts at or under 10,000:
//       the file size divided by 10,000, rounded UP to a whole number of MiB, and never below 5 MiB.
//       parts is sizeBytes / partSize rounded UP (the last part may be smaller).
//   Example: 5 * 10 ** 9 bytes -> { mode: "multipart", partSize: 5 MiB, parts: 954 }
function planMultipart(sizeBytes) {
  // TODO
}

// createUploads(options) is the server side of an upload. It keeps a row for each upload in memory.
//
//   options: {
//     now,                         // a function that returns the time in ms (the tests move it by hand)
//     newId,                       // a function that returns a new unique id, like a uuid
//     maxBytes = 5 * 2 ** 20,      // the biggest file we accept
//     allowed = ["image/jpeg", "image/png", "application/pdf"],
//     ttlMs = 5 * 60 * 1000,       // how long the signed link lives
//     pendingMaxMs = 60 * 60 * 1000, // how long a "pending" row may wait for its file
//   }
//
// It returns an object with four methods and one more:
//
//   request({ userId, contentType, sizeBytes })
//     - contentType not in allowed: throw an Error.
//     - sizeBytes not a whole number, or 0 or less, or above maxBytes: throw an Error.
//     - The SERVER picks the key: "uploads/" + userId + "/" + newId(). Ignore any key the caller sends.
//     - Save a row { key, ownerId: userId, contentType, sizeBytes, status: "pending", createdAt: now() }.
//     - Return { key, expiresAt: now() + ttlMs, signedHeaders: { "content-type": contentType, "content-length": sizeBytes } }
//       (the link must be signed with these, so the file has to match).
//
//   confirm({ key, sizeBytes, contentType })    // this plays the storage event "a file arrived"
//     - No row with this key: return "unknown".
//     - The row is not "pending" any more: return "ignored". Do not change it.
//     - The size or the content type differs from the row: set status "rejected", return "rejected".
//     - Otherwise set status "ready" and return "ready".
//
//   cleanup()
//     - Every "pending" row older than pendingMaxMs (now() - createdAt is MORE than pendingMaxMs)
//       gets status "expired". Return the list of their keys, in the order they were requested.
//
//   get(key)      -> a COPY of the row, or undefined
//   list(userId)  -> copies of the "ready" rows of this user only, in the order they were requested
function createUploads(options) {
  // TODO
}

module.exports = { planMultipart, createUploads };
