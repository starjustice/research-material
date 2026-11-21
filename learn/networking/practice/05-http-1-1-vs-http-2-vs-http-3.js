// Lesson 05: HTTP/1.1 vs HTTP/2 vs HTTP/3. Write the eleven pieces below, then run:
//   node --test learn/networking/practice/05-http-1-1-vs-http-2-vs-http-3.test.js
//
// Times are in milliseconds (ms) unless it says "tick". Never change the lists or objects you are given.
// "h1" is HTTP/1.1, "h2" is HTTP/2 over TCP, "h3" is HTTP/3 over QUIC.
//
//   h1Schedule(durations, options)
//       durations: how long each request takes alone, in order, like [100, 100, 50].
//       options: { connections: 6, connectMs: 0, keepAlive: true }   (these are the defaults)
//       Each connection does ONE request at a time. The next waiting request takes the
//       connection that is free first (the lowest connection number if two are free together).
//       A connection that is used for the first time pays connectMs before its first request.
//       With keepAlive false, every request pays connectMs.
//       Return one { conn, start, end } per request, in order. start is when the request is
//       sent (after any connect cost). end is start + the duration.
//       connections must be a whole number of 1 or more, or throw an Error.
//
//   h1LoadTime(durations, options)
//       The time when the last request ends. 0 for no requests.
//
//   h2LoadTime(durations, options)
//       options: { connectMs: 0, maxStreams: 100 }
//       One connection, paid once (connectMs). Up to maxStreams requests run at the same time;
//       more than that wait for a free stream. Return connectMs plus the time to finish all.
//       0 for no requests.
//
//   deliveryTimes(chunkCounts, protocol, lost, retransmitDelay)
//       chunkCounts: how many chunks each stream has, like [6, 1, 1].
//       protocol: "h2" (TCP) or "h3" (QUIC). Anything else: throw an Error.
//       lost: nothing, or { stream, chunk }: that chunk is lost once. retransmitDelay defaults to 8.
//       The sender sends one chunk per tick (tick 1, 2, 3, ...), taking the streams in turns:
//       stream 0 chunk 0, stream 1 chunk 0, stream 2 chunk 0, stream 0 chunk 1, ...
//       A stream that has no chunks left is skipped. A chunk arrives at its tick.
//       The lost chunk arrives retransmitDelay ticks later than that.
//       TCP gives chunks to the app in the order they were sent, so nothing is given over
//       until every earlier chunk (of ANY stream) has been given over.
//       QUIC only keeps the order inside one stream.
//       Return, for each stream, the tick when its last chunk is given to the app (0 if no chunks).
//
//   pickProtocol(clientOffers, serverSupports)
//       ALPN. Both are lists like ["h2", "http/1.1"]. The server's order wins:
//       return the first one in serverSupports that the client also offers.
//       No match: return "http/1.1".
//
//   parseAltSvc(header)
//       The Alt-Svc header, like 'h3=":443"; ma=86400, h2=":443"'.
//       Return a list of { protocol, host, port, maxAge }, in order.
//       host is the text before the last ":" inside the quotes (it can be empty).
//       port is a number. maxAge is the ma number, or 86400 when ma is missing.
//       "clear", an empty text or undefined: return [].
//
//   nextVisitProtocol(firstProtocol, altSvcHeader, udpBlocked)
//       Return "h3" when the header offers h3 with a maxAge above 0 and UDP is not blocked.
//       Otherwise return firstProtocol.
//
//   setupRoundTrips(protocol, options)
//       Round trips before the first request can be sent. options: { tls: "1.3", resumed: false, zeroRtt: false }
//       h1 and h2: 1 for TCP, plus the TLS part:
//           TLS 1.3: 1, or 0 when resumed and zeroRtt are both true.
//           TLS 1.2: 2, or 1 when resumed.
//       h3: 1, or 0 when resumed and zeroRtt are both true. (QUIC has TLS 1.3 inside.)
//       Unknown protocol, or tls other than "1.2" or "1.3": throw an Error.
//
//   survivesNetworkChange(protocol, before, after)
//       before and after: { srcIp, srcPort, dstIp, dstPort, connectionId }.
//       Does the same connection live on after the client moves to a new network?
//       h1 and h2 (TCP): a connection is named by the four address numbers (srcIp, srcPort, dstIp, dstPort).
//       h3 (QUIC): a connection is named by connectionId.
//       Return true or false. Unknown protocol: throw an Error.
//
//   methodProps(method)
//       Return { safe, idempotent } (a new object each time). Letter case does not matter.
//       GET, HEAD, OPTIONS: safe and idempotent. PUT, DELETE: idempotent, not safe.
//       POST, PATCH: neither. Any other method: throw an Error.
//
//   statusClass(code)
//       code: a whole number from 100 to 599, else throw an Error.
//       Return "informational" (1xx), "success" (2xx), "redirect" (3xx),
//       "client error" (4xx) or "server error" (5xx).
//
//   cacheState(cacheControl, ageSeconds)
//       cacheControl: the text of a Cache-Control header, like "public, max-age=60" (can be empty or undefined).
//       Letter case and spaces do not matter. Return one word, checked in this order:
//         "no-store"    the header has no-store
//         "revalidate"  the header has no-cache
//         "fresh"       there is max-age=N and ageSeconds is less than N
//         "stale"       anything else (no max-age, max-age=0, or old enough)

function h1Schedule(durations, options) {}

function h1LoadTime(durations, options) {}

function h2LoadTime(durations, options) {}

function deliveryTimes(chunkCounts, protocol, lost, retransmitDelay) {}

function pickProtocol(clientOffers, serverSupports) {}

function parseAltSvc(header) {}

function nextVisitProtocol(firstProtocol, altSvcHeader, udpBlocked) {}

function setupRoundTrips(protocol, options) {}

function survivesNetworkChange(protocol, before, after) {}

function methodProps(method) {}

function statusClass(code) {}

function cacheState(cacheControl, ageSeconds) {}

module.exports = { h1Schedule, h1LoadTime, h2LoadTime, deliveryTimes, pickProtocol, parseAltSvc, nextVisitProtocol, setupRoundTrips, survivesNetworkChange, methodProps, statusClass, cacheState };
