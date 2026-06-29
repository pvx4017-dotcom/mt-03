const base = "https://ffshoppingx9.bigselashoping.org/marketting"
for (const p of ["page/pending-payment.html", "admin/index.html", "admin/cart.html"]) {
  const html = await (await fetch(`${base}/${p}`)).text()
  const apis = [...new Set([...html.matchAll(/api\/[a-zA-Z0-9_./?=&%-]+/g)].map(m => m[0]))]
  console.log(`\n=== ${p} ===`)
  console.log(apis.join("\n") || "no api")
}
