const base = "https://ffshoppingx9.bigselashoping.org/marketting"
const r = await fetch(base + "/page/categories.html")
const html = await r.text()
const scriptStart = html.lastIndexOf("<script")
console.log(html.slice(scriptStart, scriptStart + 6000))
