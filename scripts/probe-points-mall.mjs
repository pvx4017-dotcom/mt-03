const base = "https://ffshoppingx9.bigselashoping.org/marketting"

// profile + search for points mall pages
for (const p of ["page/profile.html", "page/points-mall.html", "page/point-mall.html", "page/points.html", "page/pointmall.html"]) {
  try {
    const url = p === "page/profile.html" ? `${base}/${p.replace("page/", "page/")}` : `${base}/${p}`
    const r = await fetch(url)
    console.log(`\n=== ${p} (${r.status}) ===`)
    if (!r.ok) continue
    const html = await r.text()
    // menu labels
    const labels = [...html.matchAll(/>([^<]{2,40}(?:พอยท์|มอลล์|Point|point|mall|Mall)[^<]{0,30})</g)].map(m => m[1].trim())
    if (labels.length) console.log("Labels:", [...new Set(labels)].slice(0, 20).join(" | "))
    const apis = [...new Set([...html.matchAll(/api\/[a-zA-Z0-9_./?=&%-]+/g)].map(m => m[0]))]
    console.log("APIs:", apis.join(", ") || "none")
    const links = [...html.matchAll(/href=\"([^\"]+)\"/g)].map(m => m[1]).filter(h => /point|mall|coupon|checkin|credit/i.test(h))
    if (links.length) console.log("Links:", [...new Set(links)].join(", "))
  } catch (e) {
    console.log(p, e.message)
  }
}

// grep profile for drawer items
const profile = await (await fetch(`${base}/page/profile.html`)).text()
const drawerIdx = profile.indexOf("drawer")
console.log("\n=== profile drawer snippet ===")
console.log(profile.slice(profile.indexOf("drawer-list") > 0 ? profile.indexOf("drawer-list") : profile.indexOf("side-menu"), profile.indexOf("side-menu") > 0 ? profile.indexOf("side-menu") + 4000 : profile.indexOf("drawer") + 4000).slice(0, 5000))
