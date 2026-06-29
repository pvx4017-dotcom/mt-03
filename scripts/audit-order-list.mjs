const base = "https://ffshoppingx9.bigselashoping.org/marketting/page"
const html = await (await fetch(`${base}/order-list.html`)).text()
const i = html.indexOf("fetch(")
console.log(html.slice(i, i + 1500))
