const base = "https://ffshoppingx9.bigselashoping.org/marketting"

const r = await fetch(base + "/page/categories.html")
const html = await r.text()
console.log("categories.html length", html.length)
console.log(html.slice(0, 4000))

const r2 = await fetch(base + "/script.js?v=20260510-7")
const js = await r2.text()
const idx = js.indexOf("categor")
console.log("script.js categor snippets:")
for (const term of ["categories", "admin_product_categories", "admin_store_products", "loadCategor", "category"]) {
  let i = 0, n = 0
  while ((i = js.indexOf(term, i)) !== -1 && n < 3) {
    console.log("\n---", term, "---")
    console.log(js.slice(Math.max(0, i - 80), i + 200))
    i += term.length
    n++
  }
}
