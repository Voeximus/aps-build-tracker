// APS Build Tracker. Reads builds.json and draws everything. No build step.
(function () {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const NM = "not measured";
  const DAY = 86400000;

  // Dates in builds.json are calendar days in Phoenix time (UTC-7, no daylight saving).
  const phx = (d) => new Date(d + "T00:00:00-07:00");
  const fmtDate = (d) => phx(d).toLocaleDateString("en-US", { timeZone: "America/Phoenix", weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const daysSince = (d) => {
    const todayPhx = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Phoenix" }));
    const start = new Date(phx(d).toLocaleString("en-US", { timeZone: "America/Phoenix" }));
    todayPhx.setHours(0, 0, 0, 0); start.setHours(0, 0, 0, 0);
    return Math.round((todayPhx - start) / DAY);
  };
  const isNM = (txt) => /not measured|not applicable/i.test(txt || "");

  function stat(label, m, wide) {
    const txt = m && m.display ? m.display : NM;
    return `<div class="stat${wide ? " wide" : ""}"><div class="k">${esc(label)}</div><div class="v${isNM(txt) ? " nm" : ""}">${esc(txt)}</div></div>`;
  }
  const list = (cls, title, items, note) =>
    items && items.length ? `<details class="${cls}"${cls === "open" ? " open" : ""}><summary>${esc(title)} (${items.length})</summary><ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>${note ? `<p class="note">${esc(note)}</p>` : ""}</details>` : "";

  function sentimentText(s) {
    if (!s) return NM;
    const parts = [];
    if (s.negative != null) parts.push(`${s.negative} negative`);
    if (s.positive != null) parts.push(`${s.positive} positive`);
    if (s.neutral != null) parts.push(`${s.neutral} neutral`);
    if (s.questions != null) parts.push(`${s.questions} questions`);
    return s.summary + (parts.length ? ` (about ${parts.join(", ")})` : "");
  }

  function card(b) {
    const m = b.metrics || {};
    let when;
    if (b.releaseDate) {
      const n = daysSince(b.releaseDate);
      when = `Released ${fmtDate(b.releaseDate)} · ${n} day${n === 1 ? "" : "s"} ago`;
    } else if (b.startedDate) {
      const n = daysSince(b.startedDate);
      when = `Not released · in development since ${fmtDate(b.startedDate)} (${n} day${n === 1 ? "" : "s"})`;
    } else when = "Not released";
    const pillCls = b.status === "internal" ? "internal" : /current/i.test(b.statusLabel) ? "current" : "";
    const sources = Object.entries(m).filter(([, v]) => v && v.source).map(([k, v]) => `<li><b>${esc(LABELS[k] || k)}:</b> ${esc(v.source)}</li>`);
    if (m.sentiment && m.sentiment.countsNote) sources.push(`<li><b>Mood counts:</b> ${esc(m.sentiment.countsNote)}</li>`);
    return `<article class="card ${b.status === "internal" ? "internal" : ""}">
      <header><div><h3>${esc(b.name)}</h3><p class="date">${esc(when)}</p></div><span class="pill ${pillCls}">${esc(b.statusLabel)}</span></header>
      <p class="note">${esc(b.releaseNote || "")}</p>
      <p>${esc(b.summary || "")}</p>
      <div class="stats">
        ${stat("Bugs reported", m.bugs)}
        ${stat("Crashes reported", m.crashes)}
        ${stat("Crash files received", m.crashFiles)}
        ${stat("Typical frame time (lab)", m.frameTimeMs)}
        ${stat("Worst freeze (lab)", m.worstFreezeMs, true)}
        ${stat("Frame rate players saw", m.playerFps, true)}
        <div class="stat wide"><div class="k">Community mood</div><div class="v${isNM(m.sentiment && m.sentiment.summary) ? " nm" : ""}">${esc(sentimentText(m.sentiment))}</div></div>
      </div>
      ${list("open", "Still broken / missing", b.stillOpen)}
      ${list("fixed", "Solved", b.solved, b.solvedNote)}
      ${list("new", "Added", b.added)}
      ${b.notes ? `<p class="note">${esc(b.notes)}</p>` : ""}
      ${sources.length ? `<details class="src"><summary>Where each number came from</summary><ul>${sources.join("")}</ul></details>` : ""}
    </article>`;
  }
  const LABELS = { bugs: "Bugs", crashes: "Crashes", crashFiles: "Crash files", frameTimeMs: "Frame time", worstFreezeMs: "Worst freeze", playerFps: "Player frame rate", sentiment: "Mood" };

  function table(builds) {
    const rows = [
      ["Status", (b) => b.statusLabel],
      ["Released", (b) => (b.releaseDate ? fmtDate(b.releaseDate) : "Not released")],
      ["Days since release", (b) => (b.releaseDate ? String(daysSince(b.releaseDate)) : "—")],
      ["Bugs reported", (b) => b.metrics.bugs && b.metrics.bugs.display],
      ["Crashes reported", (b) => b.metrics.crashes && b.metrics.crashes.display],
      ["Crash files", (b) => b.metrics.crashFiles && b.metrics.crashFiles.display],
      ["Typical frame time (lab)", (b) => b.metrics.frameTimeMs && b.metrics.frameTimeMs.display],
      ["Worst freeze (lab)", (b) => b.metrics.worstFreezeMs && b.metrics.worstFreezeMs.display],
      ["Frame rate players saw", (b) => b.metrics.playerFps && b.metrics.playerFps.display],
      ["Community mood", (b) => sentimentText(b.metrics.sentiment)],
      ["Solved", (b) => String((b.solved || []).length) + " items"],
      ["Still broken / missing", (b) => String((b.stillOpen || []).length) + " items"],
    ];
    const head = `<thead><tr><th></th>${builds.map((b) => `<th>${esc(b.name)}</th>`).join("")}</tr></thead>`;
    const body = rows.map(([l, f]) => `<tr><th>${esc(l)}</th>${builds.map((b) => { const v = f(b) || NM; return `<td class="${isNM(v) ? "nm" : ""}">${esc(v)}</td>`; }).join("")}</tr>`).join("");
    $("#cmp").innerHTML = head + `<tbody>${body}</tbody>`;
  }

  // Simple horizontal bar chart in SVG. items: {label, value|null, text, color, hatch}
  function bars(title, note, items, unit) {
    const W = 520, rowH = 38, padL = 150, padR = 90, H = items.length * rowH + 10;
    const max = Math.max(1, ...items.map((i) => i.value || 0));
    const svgRows = items.map((it, i) => {
      const y = i * rowH + 8;
      const lab = `<text x="0" y="${y + 19}" fill="#c9d6ec" font-size="13">${esc(it.label)}</text>`;
      if (it.value == null) return lab + `<text x="${padL}" y="${y + 19}" fill="#93a7c6" font-size="13" font-style="italic">${esc(it.text || NM)}</text>`;
      const w = Math.max(3, ((W - padL - padR) * it.value) / max);
      const fill = it.hatch ? "url(#hatch)" : it.color || "#3d8bff";
      return lab + `<rect x="${padL}" y="${y + 4}" width="${w}" height="22" rx="5" fill="${fill}"/><text x="${padL + w + 6}" y="${y + 20}" fill="#e6eefb" font-size="13">${esc(it.text != null ? it.text : it.value + (unit || ""))}</text>`;
    }).join("");
    return `<div class="chart"><h4>${esc(title)}</h4>${note ? `<p class="note">${esc(note)}</p>` : ""}
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}"><defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#2a3f63"/><rect width="3" height="8" fill="#5f7aa6"/></pattern></defs>${svgRows}</svg></div>`;
  }

  function columns(title, note, pts) {
    const W = 520, H = 220, padB = 40, padT = 20, n = pts.length, bw = (W - 20) / n;
    const max = Math.max(...pts.map((p) => p.value));
    const g = pts.map((p, i) => {
      const h = ((H - padB - padT) * p.value) / max, x = 10 + i * bw + 4, y = H - padB - h;
      const col = p.event ? "#ff4d5e" : "#3d8bff";
      return `<rect x="${x}" y="${y}" width="${bw - 8}" height="${h}" rx="4" fill="${col}" opacity="${p.partial ? 0.6 : 1}"/>
        <text x="${x + (bw - 8) / 2}" y="${y - 5}" fill="#e6eefb" font-size="12" text-anchor="middle">${p.approx ? "~" : ""}${p.value}</text>
        <text x="${x + (bw - 8) / 2}" y="${H - padB + 16}" fill="#93a7c6" font-size="11" text-anchor="middle">${esc(p.label)}</text>
        ${p.event ? `<text x="${x + (bw - 8) / 2}" y="${H - padB + 31}" fill="#ff8a95" font-size="10" text-anchor="middle">${esc(p.event)}</text>` : ""}`;
    }).join("");
    return `<div class="chart"><h4>${esc(title)}</h4>${note ? `<p class="note">${esc(note)}</p>` : ""}<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${g}</svg></div>`;
  }

  function charts(data) {
    const B = data.builds, out = [];
    const v = (b, k) => (b.metrics[k] ? b.metrics[k].value : null);
    const t = (b, k) => (b.metrics[k] ? b.metrics[k].display : NM);
    const short = (s) => (isNM(s) ? (/applicable/.test(s) ? "not applicable" : NM) : null);
    const ref = (data.unattributed || []).find((u) => u.frameTimeRangeMs);
    const ft = B.map((b) => ({ label: b.name, value: v(b, "frameTimeMs"), text: v(b, "frameTimeMs") == null ? NM : v(b, "frameTimeMs") + " ms", color: b.status === "internal" ? "#a98bff" : "#3d8bff" }));
    if (ref) ft.push({ label: "Public build*", value: ref.frameTimeRangeMs[1], text: ref.frameTimeRangeMs.join("–") + " ms", hatch: true });
    out.push(bars("Typical frame time in lab tests (lower is better)", "* Version not named in that test, so it sits in the 'build unknown' list and is shown striped for reference only.", ft));
    out.push(bars("Bugs reported", "Not a like-for-like count: 0.1.3 covers about 3 days and lists each distinct problem (crash types and download problems included); 0.1.52 covers about 19 hours and counts non-crash bug reports only.", B.map((b) => ({ label: b.name, value: v(b, "bugs"), text: v(b, "bugs") == null ? short(t(b, "bugs")) || NM : v(b, "bugs") }))));
    out.push(bars("Players reporting crashes", "Same different windows as above. The rebuild number is a lab test, not players.", B.map((b) => ({ label: b.name, value: v(b, "crashes"), text: v(b, "crashes") == null ? NM : (b.status === "internal" ? "0 (lab)" : (b.id === "0.1.52" ? "6+" : v(b, "crashes") + "+")), color: "#ff4d5e" }))));
    out.push(bars("Crash log files received", null, B.map((b) => ({ label: b.name, value: v(b, "crashFiles"), text: v(b, "crashFiles") == null ? short(t(b, "crashFiles")) || NM : v(b, "crashFiles"), color: "#ffb547" }))));
    const s = B.find((b) => b.metrics.sentiment && b.metrics.sentiment.negative != null);
    if (s) {
      const m = s.metrics.sentiment;
      out.push(bars(`Community mood after ${s.name} (General, one evening)`, "Other builds: not measured.", [
        { label: "Negative", value: m.negative, color: "#ff4d5e" },
        { label: "Positive", value: m.positive, color: "#3ddc97" },
        { label: "Questions", value: m.questions, color: "#93a7c6" },
      ]));
    }
    $("#charts").innerHTML = out.join("");
  }

  function growth(d) {
    if (!d) return;
    const pts = d.joinsPerDay.map((p) => ({ label: phx(p.date).toLocaleDateString("en-US", { timeZone: "America/Phoenix", month: "short", day: "numeric" }), value: p.joins, approx: p.approx, partial: p.partial, event: p.event }));
    const before = d.joinsPerDay.slice(0, 3).reduce((a, p) => a + p.joins, 0);
    const total = d.joinsPerDay.reduce((a, p) => a + p.joins, 0);
    $("#growthbox").innerHTML = `<div class="charts">${columns("New members joining per day", "~ means approximate. The last day was still in progress when counted.", pts)}
      ${bars("Members online at once (about)", null, d.online.map((o) => ({ label: o.when, value: o.count, text: "~" + o.count, color: "#3ddc97" })))}</div>
      <p class="muted">About ${total} joins from ${pts[0].label} to ${pts[pts.length - 1].label}. Before the public release the pace was about ${Math.round(before / 3)} a day. ${esc(d.note)} Source: ${esc(d.source)}.</p>`;
  }

  function h2h(h) {
    if (!h) return;
    const fps = (ms) => Math.round(1000 / ms);
    const rows = h.tests.map((x) => `<tr><td>${esc(x.name)}<br><small class="muted">${esc(x.crowd)}</small></td><td>${x.publicMs} ms (${fps(x.publicMs)} fps)</td><td>${x.newMs} ms (${fps(x.newMs)} fps)</td><td>${(x.publicMs / x.newMs).toFixed(1)}x</td></tr>` + x.rows.map((r) => `<tr class="sub"><td>&nbsp;&nbsp;${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td></td></tr>`).join("")).join("");
    $("#h2hbox").innerHTML = `<h3>${esc(h.title)}</h3><p><b>${esc(h.headline)}</b></p><p class="muted">${esc(h.setup)}</p>
      <div class="tablewrap"><table><thead><tr><th>Test (typical frame, lower ms is better)</th><th>Public 0.1.52</th><th>Rebuild</th><th>Frame rate gain</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="note"><b>${esc(h.stress.name)}.</b> ${esc(h.stress.note)}</p><p class="note">${esc(h.loading)}</p>
      <h4>What is not equal yet</h4><ul>${h.caveats.map((c) => `<li>${esc(c)}</li>`).join("")}</ul><p class="muted">Source: ${esc(h.source)}</p>`;
  }

  fetch("builds.json", { cache: "no-store" })
    .then((r) => r.json())
    .then((data) => {
      $("#updated").textContent = `Data last updated ${fmtDate(data.dataUpdated)}. ${data.countingNote || ""}`;
      $("#cards").innerHTML = data.builds.map(card).join("");
      table(data.builds);
      charts(data);
      $("#unk").innerHTML = (data.unattributed || []).map((u) => `<li>${esc(u.item)}<small>${esc(u.when)} · ${esc(u.source)} · ${esc(u.why)}</small></li>`).join("");
      $("#ruleslist").innerHTML = (data.attributionRules || []).map((r) => `<li>${esc(r)}</li>`).join("");
      growth(data.discord);
      h2h(data.headToHead);
    })
    .catch((e) => { $("#cards").innerHTML = `<p>Could not load builds.json (${esc(e.message)}). If you opened this file directly, run a small local web server instead.</p>`; });
})();
