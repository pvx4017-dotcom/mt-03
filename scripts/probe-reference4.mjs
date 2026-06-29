const base = "https://ffshoppingx9.bigselashoping.org/marketting"
const r = await fetch(base + "/page/categories.html")
const html = await r.text()
const scripts = [...html.matchAll(/<script[^>]*src=\"([^\"]+)\"/g)].map(m => m[1])
console.log("external scripts:", scripts)
const inline = html.match(/<script>([\s\S]*?)<\/script>/g)
console.log("inline script blocks:", inline?.length ?? 0)
if (inline) inline.forEach((s,i) => console.log(`block ${i}:`, s.slice(0,500)))

// categories-style linked - check page body for product grid id
const ids = [...html.matchAll(/id=\"([^\"]+)\"/g)].map(m=>m[1])
console.log("ids:", ids.filter(x=>x.includes('product')||x.includes('categor')||x.includes('feed')||x.includes('list')))
