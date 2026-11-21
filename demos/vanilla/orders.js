// Demo only: nothing is loaded or saved. orders.html already holds every row, the order list and the
// default order, so the page works without this script; it filters rows, shows the chosen order and
// toggles table density in place (a server would render the result).
const orders = [
  { id: "HB-1048", customer: "Maple Street Bakery", sku: "HB-MUG-12", skuLabel: "Stoneware mug, 12 oz", qty: 24, status: "Open", tone: "warning", total: "$216.00", date: "2026-11-20", placed: "20 November 2026", shipTo: "214 Maple Street, Portland, OR", carrier: "Not shipped yet" },
  { id: "HB-1047", customer: "Northwind Hardware", sku: "HB-BASKET-L", skuLabel: "Woven laundry basket, large", qty: 6, status: "Packed", tone: "accent", total: "$171.00", date: "2026-11-19", placed: "19 November 2026", shipTo: "88 Harbor Road, Tacoma, WA", carrier: "UPS Ground" },
  { id: "HB-1046", customer: "Harbor Lane Café", sku: "HB-JAR-1L", skuLabel: "Glass storage jar, 1 litre", qty: 18, status: "Shipped", tone: "neutral", total: "$126.00", date: "2026-11-18", placed: "18 November 2026", shipTo: "5 Harbor Lane, Astoria, OR", carrier: "USPS Priority Mail" },
  { id: "HB-1045", customer: "Bluebell Florists", sku: "HB-POT-TC", skuLabel: "Terracotta plant pot", qty: 40, status: "Open", tone: "warning", total: "$260.00", date: "2026-11-18", placed: "18 November 2026", shipTo: "1730 Bluebell Avenue, Eugene, OR", carrier: "Not shipped yet" },
  { id: "HB-1044", customer: "Riverside Dental", sku: "HB-TOWEL-04", skuLabel: "Linen tea towels, set of 4", qty: 10, status: "Delivered", tone: "success", total: "$185.00", date: "2026-11-16", placed: "16 November 2026", shipTo: "402 Riverside Drive, Salem, OR", carrier: "UPS Ground" },
  { id: "HB-1043", customer: "Oakridge Primary School", sku: "HB-BOARD-OAK", skuLabel: "Oak chopping board", qty: 12, status: "Shipped", tone: "neutral", total: "$336.00", date: "2026-11-15", placed: "15 November 2026", shipTo: "60 Oakridge Road, Bend, OR", carrier: "FedEx Ground" },
  { id: "HB-1042", customer: "Pine & Co. Interiors", sku: "HB-THROW-WL", skuLabel: "Wool throw blanket", qty: 5, status: "Cancelled", tone: "danger", total: "$345.00", date: "2026-11-14", placed: "14 November 2026", shipTo: "19 Pine Street, Seattle, WA", carrier: "Cancelled" },
  { id: "HB-1041", customer: "Summit Climbing Gym", sku: "HB-CANDLE-08", skuLabel: "Soy candle, 8 oz", qty: 30, status: "Delivered", tone: "success", total: "$255.00", date: "2026-11-12", placed: "12 November 2026", shipTo: "900 Summit Way, Boise, ID", carrier: "USPS Priority Mail" },
];

const $ = (id) => document.getElementById(id);
const shell = document.querySelector("dui-app-shell");
const plural = (count) => `${count} ${count === 1 ? "order" : "orders"}`;

// Show one order in Order details, and mark its link in the order list.
const showOrder = (id, { announce = true } = {}) => {
  const order = orders.find((o) => o.id === id);
  if (!order) return false;
  $("aux-title").textContent = `Order ${order.id}`;
  $("aux-status").textContent = order.status;
  $("aux-status").dataset.badge = order.tone;
  $("aux-customer").textContent = order.customer;
  $("aux-sku").textContent = `${order.sku}, ${order.skuLabel}`;
  $("aux-qty").textContent = String(order.qty);
  const time = document.createElement("time");
  time.dateTime = order.date;
  time.textContent = order.placed;
  $("aux-placed").replaceChildren(time);
  $("aux-total").textContent = order.total;
  $("aux-ship").textContent = order.shipTo;
  $("aux-carrier").textContent = order.carrier;
  $("aux-open").href = `?order=${order.id}&view=edit`;
  $("aux-print").href = `?order=${order.id}&view=print`;
  for (const link of document.querySelectorAll("#app-aux [data-list-detail] nav a")) {
    if (link.getAttribute("href") === `?order=${order.id}`) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  if (announce) $("aux-announce").textContent = `Order ${order.id} shown in Order details.`;
  return true;
};

// A link to ?order=… (an order number in the table, or the order list): show it here instead of loading
// the page again, and open the drawer when the details sidebar does not fit beside main.
document.addEventListener("click", (event) => {
  const link = event.target instanceof Element ? event.target.closest("a[href^='?order=']:not([href*='&'])") : null;
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const id = new URLSearchParams(link.search).get("order");
  if (!id || !showOrder(id)) return;
  event.preventDefault();
  if (!$("app-aux").contains(link) && shell?.isDrawer?.("end")) shell.show("end");
});

// The order in the address bar (a link opened in a new tab) is the one shown.
const requested = new URLSearchParams(location.search).get("order");
if (requested) showOrder(requested, { announce: false });

// Selecting a row shows that order too.
$("orders-table").addEventListener("change", (event) => {
  const box = event.target;
  if (box instanceof HTMLInputElement && box.checked && box.value) showOrder(box.value);
});

// Filter bar: hide the rows that do not match and update the count.
const filters = $("order-filters");
const applyFilters = () => {
  const data = new FormData(filters);
  const customer = String(data.get("customer") ?? "").trim().toLowerCase();
  const sku = String(data.get("sku") ?? "").trim().toLowerCase();
  const status = String(data.get("status") ?? "");
  let shown = 0;
  for (const row of $("orders-table").tBodies[0].rows) {
    const order = orders.find((o) => o.id === row.cells[1].textContent.trim());
    const match = Boolean(order) && order.customer.toLowerCase().includes(customer) && order.sku.toLowerCase().includes(sku) && (!status || order.status === status);
    row.hidden = !match;
    if (match) shown += 1;
  }
  $("order-count").textContent = plural(shown);
};
filters.addEventListener("submit", (event) => {
  event.preventDefault();
  applyFilters();
});
// Reset clears the fields after this event, so apply on the next task.
filters.addEventListener("reset", () => setTimeout(applyFilters));

// Density: compact rows on the table's scroll region while the switch is on.
$("orders-compact").addEventListener("change", (event) => {
  if (event.target.checked) $("orders-region").dataset.density = "compact";
  else delete $("orders-region").dataset.density;
});

// Bulk actions: change the selected rows in place and report it. Without this script the form posts
// the checked orders with action=ship or print.
$("bulk-orders").addEventListener("submit", (event) => {
  event.preventDefault();
  const ids = new FormData(event.currentTarget).getAll("orders[]").map(String);
  if (event.submitter?.value === "ship") {
    for (const box of document.querySelectorAll("#orders-table tbody input:checked")) {
      const badge = box.closest("tr").querySelector("[data-badge]");
      badge.dataset.badge = "neutral";
      badge.textContent = "Shipped";
    }
    for (const order of orders) if (ids.includes(order.id)) Object.assign(order, { status: "Shipped", tone: "neutral" });
    $("bulk-result").textContent = `${plural(ids.length)} marked as shipped.`;
  } else if (event.submitter?.value === "print") {
    $("bulk-result").textContent = `Packing slips for ${plural(ids.length)} sent to the printer.`;
  }
});
