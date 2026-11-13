// Lesson 02: Docker images and layers. Write the four pieces below, then run:
//   node --test learn/devops-cloud/practice/02-docker-images-and-layers.test.js
//
// A Dockerfile is a list of lines, for example:
//   ["FROM node:24-alpine", "WORKDIR /usr/src/app", "COPY . .", "RUN npm ci", "RUN npm run build"]
//
//   buildPlan(oldLines, newLines, changedFiles)
//       oldLines  the Dockerfile lines of the last build ([] when there was no build yet)
//       newLines  the Dockerfile lines you build now
//       changedFiles  the files that changed since the last build, like ["src/server.ts"]
//       Return one object per new line: { line, status } where status is "CACHED" or "REBUILT".
//       The cache works from the top:
//         - a line is not cached when it is not the same text as the old line at the same place
//         - a COPY or ADD line is not cached when a file it copies has changed
//         - once one line is REBUILT, every line after it is REBUILT too
//       Which files does a COPY line copy? Its words are COPY, then sources, then the destination.
//         "COPY . ."                      copies everything
//         "COPY package*.json ./"         copies package.json and package-lock.json (* means any letters, but not a /)
//         "COPY src ./src"                copies the folder src and every file inside it
//       Ignore words that start with -- (like --chown=node:node).
//       Lines that are not COPY or ADD (FROM, RUN, CMD) only change when their text changes.
//
//   rebuildSeconds(plan, seconds)
//       plan is what buildPlan returned. seconds looks like { "RUN npm ci": 2.8 }, the time of one line.
//       Add up the seconds of the REBUILT lines only. A line that is not in seconds costs 0.
//       Round to one decimal.
//
//   imageSize(layers)
//       layers looks like [{ line: "RUN npm ci", mb: 62.3 }, ...].
//       The image is the sum of its layers. Round to one decimal.
//       (A layer that deletes a file has a size near 0. The file is still in the layer below.)
//
//   suggestOrder(lines)
//       Fix the slow order. When "COPY . ." comes before the first line that starts with
//       "RUN npm ci" or "RUN npm install", return a new list where it goes:
//           "COPY package*.json ./", that install line, then "COPY . .",
//       and every other line keeps its order. Otherwise return the lines unchanged.
//       Do not change the list you were given. Return a new list.

function buildPlan(oldLines, newLines, changedFiles) {
  // TODO
}

function rebuildSeconds(plan, seconds) {
  // TODO
}

function imageSize(layers) {
  // TODO
}

function suggestOrder(lines) {
  // TODO
}

module.exports = { buildPlan, rebuildSeconds, imageSize, suggestOrder };
