const html = await (await fetch("https://ffshoppingx9.bigselashoping.org/marketting/page/order-list.html")).text()
const fn = html.indexOf("function groupByBill")
console.log(html.slice(Math.max(0, fn - 200), fn + 2000))
