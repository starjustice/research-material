// Lesson 08: Design a URL shortener. Write the three things below, then run:
//   node --test learn/system-design/practice/08-design-a-url-shortener.test.js

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";   // 62 letters, in this order

// toBase62(n) turns a whole number into a short code. The digits are the ALPHABET letters, so:
//   0 -> "0"   9 -> "9"   10 -> "a"   35 -> "z"   36 -> "A"   61 -> "Z"   62 -> "10"   125 -> "21"
// It throws a RangeError when n is negative or not a whole number.
function toBase62(n) {
  // TODO
}

// fromBase62(code) is the opposite: "10" -> 62, "21" -> 125.
// It throws an Error when the code is empty or has a letter that is not in the ALPHABET.
function fromBase62(code) {
  // TODO
}

// createShortener({ nextCode, now, maxTries }) makes a small in-memory link table.
//   nextCode()  gives the next code to try (for example toBase62(counter++)). The caller owns it.
//   now()       gives the time in milliseconds. The default is Date.now. Tests pass a fake clock.
//   maxTries    how many codes create() may try before it gives up. The default is 5.
//
// It returns an object with these methods:
//
//   create(longUrl, { alias, ttlSeconds })
//       Saves the link and returns its code.
//       - With an alias: the alias is the code. If the alias is already taken, throw Error("alias taken")
//         and change nothing.
//       - Without an alias: call nextCode(). If that code is already taken (a collision), call nextCode()
//         again, up to maxTries codes in total. Never overwrite a taken code.
//         If all the tries are taken, throw Error("no free code").
//       - With ttlSeconds: the link stops working ttlSeconds after now().
//       The same long link saved twice gets two different codes.
//
//   resolve(code)
//       { status: 404 }                           the code never existed
//       { status: 410 }                           the code existed but has expired (now() >= its end time)
//       { status: 302, location: longUrl }        the code works
//       An expired code stays taken: nobody can reuse it as an alias.
//
//   size()      how many codes are stored (expired ones count too).
function createShortener({ nextCode, now = Date.now, maxTries = 5 }) {
  // TODO
}

module.exports = { toBase62, fromBase62, createShortener };
