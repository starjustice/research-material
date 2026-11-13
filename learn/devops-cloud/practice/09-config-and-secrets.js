// Lesson 09: Config and secrets. Write the nine pieces below, then run:
//   node --test learn/devops-cloud/practice/09-config-and-secrets.test.js
//
// Use only made-up values like "not-a-real-secret". Never put a real password in a file.
//
// Part 1: the config loader
//
//   envToConfig(env, prefix)
//       env is a plain object like process.env. prefix is text like "APP_".
//       Keep only the names that START with the prefix. Cut the prefix off, then turn the rest into
//       camelCase: "APP_PORT" -> "port", "APP_DB_HOST" -> "dbHost", "APP_LOG_LEVEL" -> "logLevel".
//       Values stay exactly as they are (text, even "3000" or "false").
//       A name that is only the prefix ("APP_") is ignored.
//
//   mergeConfig(defaults, fileConfig, envConfig)
//       Three plain objects. Later wins: defaults, then the file, then the environment.
//       A value of undefined does not override anything. Any other value does, including 0, false,
//       null and "". A source can be undefined (treat it as empty).
//       Return a NEW object. Do not change the three inputs.
//
//   missingKeys(config, required)
//       required is a list of key names. Return the ones that are missing from config, in the
//       same order as the required list. Missing means undefined, null or "" (empty text).
//       0 and false are real values, so they are NOT missing.
//
//   valueSeenBy(where, name, buildEnv, runEnv)
//       Model of Next.js. where is "browser" or "server". The code names the variable directly,
//       like process.env.NEXT_PUBLIC_API_URL. buildEnv holds the values when the image was built.
//       runEnv holds the values when the container started.
//         A name that starts with NEXT_PUBLIC_ (capital letters count): the value comes from buildEnv,
//           in the browser and on the server, because the build pasted it into the code.
//         Any other name: the browser gets undefined, the server gets the value from runEnv.
//
// Part 2: the redactor and the layers
//
//   isSecretKey(name)
//       true when the name contains password, passwd, secret, token, key or credential
//       (any capital letters). So "DB_PASSWORD", "apiKey" and "AWS_SECRET_ACCESS_KEY" are secret,
//       and "PORT" and "author" are not.
//
//   redactText(line)
//       line is one log line (text). Return it with two kinds of secret masked:
//         1. NAME=value where isSecretKey(NAME) is true: the value (up to the next space) becomes ***
//            "start API_TOKEN=abc port=3000" -> "start API_TOKEN=*** port=3000"
//         2. a password inside a URL: scheme://user:password@host -> scheme://user:***@host
//            "postgres://app:pw@db:5432/shop" -> "postgres://app:***@db:5432/shop"
//            A URL with no user and password (https://example.com:8080/a@b) is not changed.
//
//   redact(value)
//       value is any data you want to log: an object, a list, text, a number.
//       Return a NEW copy where every value under a secret key (isSecretKey) is the text "***",
//       whatever it was (even an object, a number or null). Go into nested objects and lists.
//       A text value gets the URL password mask from redactText (rule 2). Other values stay the same.
//       Do not change the original.
//
//   leakedIn(layers, needle)
//       layers is a list of image layers, first layer first. Each layer looks like
//         { cmd: "COPY .env app.js ./", files: { "/app/.env": "text of the file" }, removes: ["/app/.env"] }
//       files and removes are optional. cmd is the line shown by "docker history".
//       Return the numbers (starting at 1) of the layers where the text needle is inside the cmd
//       or inside the text of any file the layer added. Return [] when there is none.
//       Careful: a path in removes only hides the file from the container. The text is still in the
//       layer that added it.
//
//   visibleFiles(layers)
//       The files the container sees. Go through the layers in order: add the paths in files,
//       then delete the paths in removes. Return the paths left, sorted.

function envToConfig(env, prefix) {
  // TODO
}

function mergeConfig(defaults, fileConfig, envConfig) {
  // TODO
}

function missingKeys(config, required) {
  // TODO
}

function valueSeenBy(where, name, buildEnv, runEnv) {
  // TODO
}

function isSecretKey(name) {
  // TODO
}

function redactText(line) {
  // TODO
}

function redact(value) {
  // TODO
}

function leakedIn(layers, needle) {
  // TODO
}

function visibleFiles(layers) {
  // TODO
}

module.exports = { envToConfig, mergeConfig, missingKeys, valueSeenBy, isSecretKey, redact, redactText, leakedIn, visibleFiles };
