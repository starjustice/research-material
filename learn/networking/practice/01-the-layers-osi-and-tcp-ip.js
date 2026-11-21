// Lesson 01: The layers, OSI and TCP/IP. Write the eight pieces below, then run:
//   node --test learn/networking/practice/01-the-layers-osi-and-tcp-ip.test.js
//
// A message goes down the layers and each layer wraps it in a header (encapsulation).
// A frame is plain nested objects. The outer box is the link layer, then internet, then transport:
//   { layer: "link",      header: { src, dst },        payload:
//   { layer: "internet",  header: { src, dst, ttl },   payload:
//   { layer: "transport", header: { src, dst },        payload: message } } }
// link headers hold MAC addresses, internet headers hold IP addresses (and ttl), transport headers hold ports.
// Never change the objects you are given.
//
//   layerOf(protocol)
//       protocol: text like "HTTP" or "tcp" (any letter case).
//       Return { tcpip, osi } where tcpip is "application", "transport", "internet" or "link",
//       and osi is the OSI layer number. Use this table:
//         http, dns, ssh, smtp      application, 7
//         tls                       application, 6   (TLS has no clean place. Use 6.)
//         tcp, udp, quic            transport, 4
//         ip, icmp                  internet, 3
//         ethernet, wifi            link, 2
//       An unknown protocol: throw an Error.
//
//   tcpipLayerFor(osiNumber)
//       The 4 layer name that holds an OSI layer: 7, 6, 5 are "application", 4 is "transport",
//       3 is "internet", 2 and 1 are "link".
//       Not a whole number from 1 to 7: throw an Error.
//
//   encapsulate(message, a)
//       a: { srcMac, dstMac, srcIp, dstIp, srcPort, dstPort }.
//       Return the frame shown above. The internet header starts with ttl 64.
//
//   decapsulate(frame, me)
//       me: { mac, ip, port }. Peel from the outside, and stop at the first layer that is not for me.
//         frame header dst is not me.mac      { ok: false, droppedAt: "link",      reason: "not my MAC address" }
//         packet header dst is not me.ip      { ok: false, droppedAt: "internet",  reason: "not my IP address" }
//         segment header dst is not me.port   { ok: false, droppedAt: "transport", reason: "nothing listens on that port" }
//       All three match: { ok: true, message }.
//
//   routerForward(frame, routerMac, nextMac)
//       A router builds a new link header: src is routerMac, dst is nextMac.
//       The IP header keeps its src and dst, but ttl goes down by 1. The transport part does not change.
//       If ttl is 1 or less, the router drops it: { ok: false, reason: "ttl expired" }.
//       Otherwise return { ok: true, frame }.
//
//   wireBytes(payloadBytes)
//       One segment carries at most 1460 bytes of message. Every segment also carries
//       14 bytes of Ethernet header, 20 bytes of IP header and 20 bytes of TCP header (54 in all).
//       Return { segments, totalBytes }. segments is at least 1, even for 0 bytes.
//       Not a whole number of 0 or more: throw an Error.
//
//   routeKey(device, request)
//       The text a load balancer uses to choose a server.
//       request: { srcIp, srcPort, dstIp, dstPort, host, path }.
//         "l4-load-balancer"  reads only addresses and ports: "srcIp:srcPort->dstIp:dstPort"
//         "l7-load-balancer"  reads the HTTP request: host followed by path, like "shop.test/api/cart"
//       Any other device: throw an Error.
//
//   canSeePath(device, options)
//       Can this device read the URL path of an HTTPS request?
//       options: { tlsEndsHere: true or false } (true when the device holds the certificate and ends the HTTPS).
//       Only "l7-load-balancer" can, and only when tlsEndsHere is true. Everything else: false.

function layerOf(protocol) {
  // your code
}

function tcpipLayerFor(osiNumber) {
  // your code
}

function encapsulate(message, a) {
  // your code
}

function decapsulate(frame, me) {
  // your code
}

function routerForward(frame, routerMac, nextMac) {
  // your code
}

function wireBytes(payloadBytes) {
  // your code
}

function routeKey(device, request) {
  // your code
}

function canSeePath(device, options) {
  // your code
}

module.exports = { layerOf, tcpipLayerFor, encapsulate, decapsulate, routerForward, wireBytes, routeKey, canSeePath };
