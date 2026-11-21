// Lesson 24: Cloud cost basics. Write the nine pieces below, then run:
//   node --test learn/devops-cloud/practice/24-cloud-cost-basics.test.js
//
// This is a small model of a cloud bill. The prices in the test file are examples (AWS, US East N. Virginia,
// read on 2026-11-19). They change, so never copy them into real work. Money is in US dollars.
// Round every money result to cents like this: Math.round(n * 100 + 1e-9) / 100
//
//   estimateBill(usage, prices)
//       Return { lines, total }. lines is a list of exactly seven { name, cost }, in this order:
//         "compute"        usage.servers x price of usage.serverType (prices.server[type]) x hours
//         "database"       prices.db[usage.dbType] x hours, plus usage.dbStorageGb x prices.dbStoragePerGb.
//                          No usage.dbType means no database, so 0.
//         "load balancer"  usage.loadBalancers x (prices.lbPerHour x hours + usage.lcu x prices.lcuPerHour x hours)
//         "nat gateway"    usage.natGateways x prices.natPerHour x hours, plus usage.natGb x prices.natPerGb
//         "data out"       the GB above prices.egressFreeGb (never below 0) x prices.egressPerGb
//         "disk"           (usage.diskGb + usage.unattachedDiskGb) x prices.diskPerGb. A disk costs money when it is not attached too.
//         "logs"           usage.logIngestGb x prices.logIngestPerGb, plus usage.logStoredGb x prices.logStoragePerGb
//       hours is usage.hours, or 730 when it is missing. Any usage number that is missing counts as 0.
//       Round each line to cents. total is the sum of the rounded lines, rounded again.
//       A server type or a database type that is not in the price table is an error:
//         throw new Error("unknown server type: " + type)   or   "unknown database type: " + type
//       (only when you use that kind of thing: no servers means no check). Never change usage or prices.
//
//   biggestLine(bill)
//       Return the name of the line with the biggest cost. On a tie, the first one. No lines: null.
//
//   breakEvenShare(onDemandPerHour, committedPerHour)
//       The share of the hours (0 to 1 or more) that a server must run for a plan to cost less than on demand.
//       It is committedPerHour / onDemandPerHour, rounded to 4 decimals (Math.round(x * 10000) / 10000).
//       throw new Error("onDemandPerHour must be more than 0") when onDemandPerHour is 0 or less.
//       throw new Error("committedPerHour must be 0 or more") when committedPerHour is below 0.
//
//   cheaperOption(hoursUsed, hoursInPeriod, onDemandPerHour, committedPerHour)
//       On demand costs hoursUsed x onDemandPerHour. A plan costs hoursInPeriod x committedPerHour: you pay for every hour.
//       Return { option, onDemandCost, commitCost } with both costs rounded to cents.
//       option is "commit" only when the plan is cheaper. On a tie it is "on demand" (no promise to keep).
//       throw new Error("hoursUsed must be between 0 and hoursInPeriod") when hoursUsed is below 0 or above hoursInPeriod.
//
//   rightSize(sizes, current, peakCpuPercent)
//       sizes is a list from the smallest to the biggest. Return one size down when the peak CPU is 40 or less.
//       Return one size up when the peak CPU is 85 or more. Otherwise return current.
//       Never go below the smallest or above the biggest size.
//       throw new Error("unknown size: " + current) when current is not in sizes.
//
//   findWaste(resources)
//       Return a list of { id, reason }, sorted by id, for the things that cost money and do nothing:
//         type "volume"         with attached === false              reason "unattached volume"
//         type "load-balancer"  with requestsLast7Days === 0          reason "no traffic"
//         type "public-ip"      with inUse === false                  reason "idle public address"
//         type "log-group"      with retentionDays null or missing    reason "logs never expire"
//       A missing field on the other three kinds is not waste. Other types are left alone. Never change the input.
//
//   forecastMonth(dailySpend, daysInMonth)
//       dailySpend is the spend of each day so far. The forecast is the average day times daysInMonth, rounded to cents.
//       No days yet: 0.
//
//   firstAlertDay(dailySpend, budget, percent)
//       The first day (counting from 1) on which the total so far is at least percent of the budget. For example
//       percent 80 of a budget of 200 is 160. Reaching it exactly counts. Never reached: null.
//
//   costByTag(items, tagKey)
//       items is a list of { name, cost, tags } (tags may be missing). Return an object that adds up the cost of each
//       value of tags[tagKey]. A thing without that tag goes under "(untagged)". Round each sum to cents.

function estimateBill(usage, prices) {
  // TODO
}

function biggestLine(bill) {
  // TODO
}

function breakEvenShare(onDemandPerHour, committedPerHour) {
  // TODO
}

function cheaperOption(hoursUsed, hoursInPeriod, onDemandPerHour, committedPerHour) {
  // TODO
}

function rightSize(sizes, current, peakCpuPercent) {
  // TODO
}

function findWaste(resources) {
  // TODO
}

function forecastMonth(dailySpend, daysInMonth) {
  // TODO
}

function firstAlertDay(dailySpend, budget, percent) {
  // TODO
}

function costByTag(items, tagKey) {
  // TODO
}

module.exports = { estimateBill, biggestLine, breakEvenShare, cheaperOption, rightSize, findWaste, forecastMonth, firstAlertDay, costByTag };
