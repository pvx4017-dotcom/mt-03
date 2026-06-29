const r = await fetch("https://ffshoppingx9.bigselashoping.org/marketting/page/categories-script.js?v=20260422-3")
const js = await r.text()
console.log(js.slice(0, 8000))
