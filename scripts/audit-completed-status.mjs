const base = "https://ffshoppingx9.bigselashoping.org/marketting/page"
for (const p of ["completed.html", "to-receive.html"]) {
  const html = await (await fetch(`${base}/${p}`)).text()
  const i = html.indexOf("admin_shipping")
  console.log("\n===", p, "===")
  console.log(html.slice(i, i + 1200))
}
