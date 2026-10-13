/* Queenstown Run Club — next-run logic.
   Edit RUNS to change the weekly schedule. Everything is in Queenstown time
   (Pacific/Auckland) no matter where the visitor is. */
(function () {
  "use strict";

  var TZ = "Pacific/Auckland";

  // dow: 0 = Sunday … 6 = Saturday. Times are 24h, local to Queenstown.
  var RUNS = [
    {
      dow: 3, hour: 18, minute: 15, durationMin: 90,
      day: "Wednesday",
      title: "Social 5K",
      desc: "Queenstown Marina to the bridge and back. Finish at Altitude Brewing for a drink and a catch-up.",
      time: "6:15pm",
      place: "Altitude Brewing",
      dist: "5 km",
      map: "https://www.google.com/maps/search/?api=1&query=Altitude+Brewing+Queenstown"
    },
    {
      dow: 5, hour: 6, minute: 20, durationMin: 100,
      day: "Friday",
      title: "Quest",
      desc: "Sunrise on Queenstown Hill. Park at 6:20am, meet at the Basket of Dreams by 7:00am, run down together.",
      time: "6:20am",
      place: "Queenstown Hill car parks",
      dist: "Hill climb",
      map: "https://www.google.com/maps/search/?api=1&query=Queenstown+Hill+Walking+Track"
    }
  ];

  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Wall-clock parts for an instant, in Queenstown time.
  var partsFmt = new Intl.DateTimeFormat("en-NZ", {
    timeZone: TZ, hourCycle: "h23",
    year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", second: "numeric", weekday: "short"
  });
  var WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  function nzParts(date) {
    var out = {};
    partsFmt.formatToParts(date).forEach(function (p) { out[p.type] = p.value; });
    return {
      y: +out.year, m: +out.month, d: +out.day,
      h: +out.hour % 24, min: +out.minute, s: +out.second,
      dow: WD[out.weekday]
    };
  }

  // Convert a Queenstown wall-clock time to a real instant (handles DST).
  function nzToInstant(y, m, d, h, min) {
    var target = Date.UTC(y, m - 1, d, h, min, 0);
    var guess = target;
    for (var i = 0; i < 3; i++) {
      var p = nzParts(new Date(guess));
      var asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s);
      var diff = asUtc - target;
      if (diff === 0) break;
      guess -= diff;
    }
    return new Date(guess);
  }

  function nextRun(now) {
    var p = nzParts(now);
    var best = null;
    RUNS.forEach(function (run) {
      var ahead = (run.dow - p.dow + 7) % 7;
      // Today's date at midnight NZ, then add days.
      var base = Date.UTC(p.y, p.m - 1, p.d);
      for (var k = 0; k < 2; k++) {
        var dayMs = base + (ahead + 7 * k) * 86400000;
        var dd = new Date(dayMs);
        var start = nzToInstant(dd.getUTCFullYear(), dd.getUTCMonth() + 1, dd.getUTCDate(), run.hour, run.minute);
        var end = new Date(start.getTime() + run.durationMin * 60000);
        if (end > now) {
          if (!best || start < best.start) best = { run: run, start: start, end: end };
          break;
        }
      }
    });
    return best;
  }

  function ordinal(n) {
    var s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function countdownText(now, next) {
    if (now >= next.start) return "Happening now";
    var ms = next.start - now;
    var mins = Math.floor(ms / 60000);
    var days = Math.floor(mins / 1440);
    var hours = Math.floor((mins % 1440) / 60);
    var m = mins % 60;
    if (days > 0) return "In " + days + (days === 1 ? " day " : " days ") + hours + "h";
    if (hours > 0) return "In " + hours + "h " + m + "m";
    return "In " + m + " min";
  }

  function render() {
    var now = new Date();
    var next = nextRun(now);
    if (!next) return;
    var run = next.run;
    var sp = nzParts(next.start);
    var today = nzParts(now);
    var isToday = sp.y === today.y && sp.m === today.m && sp.d === today.d;
    var isTomorrow = (function () {
      var t = nzParts(new Date(now.getTime() + 86400000));
      return sp.y === t.y && sp.m === t.m && sp.d === t.d;
    })();

    set("nextDay", isToday ? "Today" : isTomorrow ? "Tomorrow" : run.day);
    set("nextDate", DAYS[sp.dow] + " " + ordinal(sp.d) + " " + MONTHS[sp.m - 1]);
    set("nextTitle", run.title);
    set("nextDesc", run.desc);
    set("nextTime", run.time);
    set("nextPlace", run.place);
    set("nextDist", run.dist);
    set("nextCountdown", countdownText(now, next));
    var map = document.getElementById("nextMap");
    if (map) map.href = run.map;

    // Highlight today in the week strip.
    var strip = document.getElementById("weekStrip");
    if (strip) {
      Array.prototype.forEach.call(strip.children, function (li) {
        li.classList.toggle("today", +li.getAttribute("data-dow") === today.dow);
        if (+li.getAttribute("data-dow") === today.dow) li.setAttribute("aria-current", "date");
        else li.removeAttribute("aria-current");
      });
    }
  }

  function set(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  try {
    render();
    setInterval(render, 30000);
  } catch (e) {
    // Leave the static Wednesday defaults in place if anything goes wrong.
    set("nextCountdown", "Every Wednesday & Friday");
  }
})();
