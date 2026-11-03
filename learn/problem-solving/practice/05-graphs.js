/**
 * Lesson 05: Graphs, BFS, DFS and ordering.
 *
 * 1. numIslands(grid)
 *    grid is an array of arrays of "1" (land) and "0" (water). An island is land joined up, down, left or right.
 *    Return how many islands there are. Do not break the caller's grid (copy it, or keep a visited set).
 *    It must also work on a 300 x 300 grid that is all land. A recursive DFS can run out of stack there.
 *
 * 2. canFinish(numCourses, prerequisites)
 *    Courses are 0 to numCourses - 1. A pair [a, b] means "take b before a".
 *    Return true if there is an order to take all courses (no cycle), else false.
 *
 * 3. shortestPath(graph, from, to)
 *    graph is an object: { A: ["B", "C"], B: ["D"], ... } (each node lists its neighbours, edges can be used both ways
 *    only if both lists say so). Return the fewest edges from "from" to "to", or -1 if there is no path.
 *
 * Run: node --test practice/05-graphs.test.js
 */

function numIslands(grid) {
}

function canFinish(numCourses, prerequisites) {
}

function shortestPath(graph, from, to) {
}

module.exports = { numIslands, canFinish, shortestPath };
