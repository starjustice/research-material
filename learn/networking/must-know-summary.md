# Networking: what to know first

**Written:** 2026-11-25 · **For:** Software Engineer and Senior Software Engineer interviews

This page is a short map of the 8 networking lessons. It tells you which ones to learn first and gives you the sentence to say out loud. If a lesson feels hard, read the line here first, then open the lesson.

**How to read the stars.** This is my judgement of how often interviewers ask each topic.

- ★★★ Almost every interview asks this. Learn these first.
- ★★ Often asked. Learn these second.
- ★ Asked for depth.

## The big picture in one story

"What happens when you type a URL?" is the most common networking question. The lessons are the steps of that answer:

1. DNS turns the name into an IP address (02).
2. TCP connects with a 3 message handshake (03).
3. TLS makes it private (04).
4. HTTP sends the request, over HTTP/1.1, 2 or 3 (05).
5. The browser builds the page: DOM, layout, paint (08).

Learn this answer first. Every lesson is one step of it.

## ★★★ Learn these first

| Lesson | Say this in the interview | Common trap |
|---|---|---|
| [02 DNS](02-dns.md) | DNS turns a name into an IP before the connection starts. The resolver asks root, then the TLD server, then the domain's own server. Answers are cached for the TTL. | A DNS change is only as fast as the old TTL. Lower the TTL one full old TTL before a move. |
| [03 TCP vs UDP](03-tcp-vs-udp.md) | IP only does its best, so pieces can be lost or mixed up. TCP fixes that with numbered bytes, ACKs and resending. UDP does not, so it is faster. | The handshake costs one round trip before any data. Use UDP when late data is useless (calls, games, QUIC). |
| [04 TLS and HTTPS](04-tls-and-https.md) | Slow asymmetric math makes a shared secret once. Then a fast symmetric cipher protects the data. TLS 1.3 needs one round trip. | HTTPS hides the content, but the IP, the site name (SNI), sizes and timing stay visible. |
| [06 Cookies, CORS, same origin](06-cookies-cors-and-same-origin.md) | An origin is scheme + host + port. The browser enforces CORS, the server only sends headers. A blocked answer was still made by the server. | Cookies across origins need `credentials: "include"`, one exact origin (not `*`), and `Allow-Credentials: true`. |

## ★★ Learn these second

| Lesson | Say this in the interview | Common trap |
|---|---|---|
| [01 Layers](01-the-layers-osi-and-tcp-ip.md) | Each layer does one job and only talks to its neighbours. Layer 7 is the app, layer 4 is TCP or UDP, layer 3 is IP, layer 2 is Ethernet. | MAC is the next stop, IP is the machine, port is the program. MAC changes at every router. |
| [05 HTTP/1.1, 2, 3](05-http-1-1-vs-http-2-vs-http-3.md) | HTTP/1.1 does one request at a time per connection. HTTP/2 has many streams on one connection. HTTP/3 runs on QUIC over UDP, so one lost packet stops one stream only. | HTTP/2 fixed the line in HTTP, but TCP still holds all streams when a packet is lost. |
| [07 WebSockets and SSE](07-websockets-and-server-sent-events.md) | Polling asks on a timer. SSE is one way and the browser reconnects for you. A WebSocket is two way and does not reconnect for you. | Several servers need a shared place (like Redis pub/sub) to send to the right connection. |
| [08 How the browser renders](08-how-the-browser-renders-a-page.md) | DOM, then render tree, then layout, paint, composite. CSS blocks the first paint. A plain script blocks the parser. Use `defer` or `async`. | Files that JavaScript or CSS `@import` creates start late. Put important files in the HTML. |

## The 4 questions most likely to come up

1. "What happens when you type a URL and press Enter?" (02, 03, 04, 05, 08)
2. "I changed a DNS record an hour ago and some users still see the old site. Why?" (02)
3. "My React app gets a CORS error calling my API. What is going on?" (06)
4. "Polling, SSE or WebSockets?" (07)

## Practice

- Lessons have quizzes in `learn/networking/quiz/`.
- For the system design link, read [networking for system design](networking-for-system-design.md) and its cheat sheet.
- A step by step page for the URL story is [url to page, step by step](networking-url-to-page-step-by-step-cheatsheet.html).

## Honest notes

- This page only compresses the lessons' "Remember" lines. If it disagrees with a lesson, the lesson is right.
