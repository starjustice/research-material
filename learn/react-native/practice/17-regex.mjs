// Lesson 17: Regex for mobile forms. Fill in each function with a regular expression.
// Run the tests with:  npm run test:17
// Tip: write the regex as a constant first, then use it in the function.

// Task 1: exactly 6 digits, nothing else (an OTP code). "123456" yes, "12345" no, "12a456" no.
export function isOtp(text) {
  return false;
}

// Task 2: keep only the digits. Used in a TextInput onChangeText.
// "0812-345 (67)" becomes "081234567".
export function onlyDigits(text) {
  return text;
}

// Task 3: put a separator between groups of three digits, from the right.
// formatThousands(1234567) is "1.234.567". formatThousands(999) is "999". Default separator is ".".
// Use a regular expression. Do not use toLocaleString.
export function formatThousands(number, separator = ".") {
  return String(number);
}

// Task 4: read a deep link like "myapp://product/123?ref=abc".
// Return { screen: "product", id: "123", ref: "abc" }. The ref part is optional (then ref is undefined).
// Return null if the text does not look like a deep link for the "myapp" scheme.
export function parseDeepLink(url) {
  return null;
}

// Task 5: a password needs at least 8 characters, one lowercase letter,
// one uppercase letter and one digit. Use lookaheads.
export function isStrongPassword(password) {
  return false;
}

// Task 6: hide the middle of a 16 digit card number.
// "4111111111111111" becomes "4111 **** **** 1111". Return null if it is not exactly 16 digits.
export function maskCard(number) {
  return null;
}

// Task 7: find every hashtag in a text. A hashtag is # followed by letters, digits or underscore.
// "Learning #ReactNative and #regex_2026!" gives ["ReactNative", "regex_2026"] (without the #).
export function extractHashtags(text) {
  return [];
}
