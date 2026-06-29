const base = "https://ffshoppingx9.bigselashoping.org/marketting/page"
const pages = ["to-receive.html", "completed.html", "to-ship.html", "after-sales.html", "checkin.html", "coupon.html"]
for (const p of pages) {
  const r = await fetch(`${base}/${p}`)
  const html = await r.text()
  const apis = [...new Set([...html.matchAll(/api\/[a-zA-Z0-9_./?=&%-]+/g)].map(m => m[0]))]
  console.log(`\n${p} (${r.status}):`, apis.join(", ") || "none")
  console.log("scripts:", [...html.matchAll(/src=\"([^\"]+\.js)/g)].map(m=>m[1]))
}
