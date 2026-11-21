import { useState, type CSSProperties, type FormEvent, type MouseEvent } from 'react'
import '../../../web-components/dui-combobox.js'
import '../../../web-components/dui-table.js'
import '../../../web-components/dui-toolbar.js'
import Layout from './Layout.tsx'
import { customers, orders, skus, statuses, type Order } from './orderData.ts'

const noFilter = { customer: '', sku: '', status: '' }

const matches = (order: Order, filter: typeof noFilter) =>
  order.customer.toLowerCase().includes(filter.customer.trim().toLowerCase()) &&
  order.sku.toLowerCase().includes(filter.sku.trim().toLowerCase()) &&
  (!filter.status || order.status === filter.status)

// The part of <dui-app-shell> (../../web-components/dui-app-shell.js) this page calls.
type AppShell = HTMLElement & { isDrawer(edge: 'start' | 'end'): boolean; show(edge: 'start' | 'end'): void }

const plural = (count: number) => `${count} ${count === 1 ? 'order' : 'orders'}`

// The order in the address bar (a link opened in a new tab) is the one shown.
const requested = () => {
  const id = new URLSearchParams(location.search).get('order')
  return orders.some((order) => order.id === id) ? (id as string) : orders[0].id
}

export default function OrdersPage() {
  const [filter, setFilter] = useState(noFilter)
  const [compact, setCompact] = useState(false)
  const [selectedId, setSelectedId] = useState(requested)
  const [announcement, setAnnouncement] = useState('')
  const [shipped, setShipped] = useState<string[]>([])
  const [bulkResult, setBulkResult] = useState('')

  // Every row stays rendered (filtered rows are hidden), so <dui-table> can sort and select them in place.
  const rows = orders.map((order) => (shipped.includes(order.id) ? { ...order, status: 'Shipped', tone: 'neutral' } : order))
  const shownCount = rows.filter((order) => matches(order, filter)).length
  const selected = rows.find((order) => order.id === selectedId) ?? rows[0]

  function showOrder(id: string) {
    setSelectedId(id)
    setAnnouncement(`Order ${id} shown in Order details.`)
  }

  // A link to ?order=…: show that order here instead of loading the page again, and open the drawer
  // when the details sidebar does not fit beside main.
  function openOrder(event: MouseEvent<HTMLAnchorElement>, id: string, { drawer = false } = {}) {
    if (event.ctrlKey || event.metaKey || event.shiftKey) return
    event.preventDefault()
    showOrder(id)
    const shell = document.querySelector<AppShell>('dui-app-shell')
    if (drawer && shell?.isDrawer('end')) shell.show('end')
  }

  function applyFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setFilter({
      customer: String(data.get('customer') ?? ''),
      sku: String(data.get('sku') ?? ''),
      status: String(data.get('status') ?? ''),
    })
  }

  // Without this handler the form posts the checked orders with action=ship or print.
  function bulkAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const ids = new FormData(event.currentTarget).getAll('orders[]').map(String)
    if (submitter?.value === 'ship') {
      setShipped((before) => [...new Set([...before, ...ids])])
      setBulkResult(`${plural(ids.length)} marked as shipped.`)
    } else if (submitter?.value === 'print') {
      setBulkResult(`Packing slips for ${plural(ids.length)} sent to the printer.`)
    }
  }

  const aux = (
    <aside id="app-aux" aria-label="Order details" className="stack">
      <div data-list-detail="">
        <nav aria-label="Orders">
          <ul>
            {rows.map(({ id, customer, total }) => (
              <li key={id}>
                <a href={`?order=${id}`} aria-current={id === selected.id ? 'page' : undefined} onClick={(event) => openOrder(event, id)}>
                  Order {id} <small>{customer} · {total}</small>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <section aria-labelledby="aux-title" tabIndex={0}>
          <h2 id="aux-title">Order {selected.id}</h2>
          <p><span data-badge={selected.tone} id="aux-status">{selected.status}</span></p>
          <dl>
            <dt>Customer</dt>
            <dd id="aux-customer">{selected.customer}</dd>
            <dt>SKU</dt>
            <dd id="aux-sku">{selected.sku}, {selected.skuLabel}</dd>
            <dt>Quantity</dt>
            <dd id="aux-qty">{selected.qty}</dd>
            <dt>Placed</dt>
            <dd id="aux-placed"><time dateTime={selected.date}>{selected.placed}</time></dd>
            <dt>Total</dt>
            <dd id="aux-total">{selected.total}</dd>
            <dt>Ship to</dt>
            <dd id="aux-ship">{selected.shipTo}</dd>
            <dt>Carrier</dt>
            <dd id="aux-carrier">{selected.carrier}</dd>
          </dl>
          <p className="cluster">
            <a href={`?order=${selected.id}&view=edit`} id="aux-open" data-button="">Open order</a>
            <a href={`?order=${selected.id}&view=print`} id="aux-print" data-button="">Print</a>
          </p>
          <p role="status" className="visually-hidden" id="aux-announce">{announcement}</p>
        </section>
      </div>
    </aside>
  )

  return (
    <Layout current="orders" aux={aux}>
      <header data-page-header="">
        <nav aria-label="Breadcrumb" data-breadcrumb="">
          <ol>
            <li><a href="/">Homebase</a></li>
            <li><a href="/orders.html" aria-current="page">Orders</a></li>
          </ol>
        </nav>
        <h1>Orders</h1>
        <p>Every order in the warehouse queue: who it is for, what to pick, and where it stands.</p>
      </header>

      <search data-filter-bar="" aria-label="Filter orders">
        <form method="get" id="order-filters" onSubmit={applyFilter} onReset={() => setFilter(noFilter)}>
          <dui-combobox>
            <label htmlFor="filter-customer">Customer</label>
            <input type="text" id="filter-customer" name="customer" list="filter-customers" />
            <datalist id="filter-customers">
              {customers.map((customer) => (
                <option key={customer} value={customer}></option>
              ))}
            </datalist>
          </dui-combobox>
          <dui-combobox>
            <label htmlFor="filter-sku">SKU</label>
            <input type="text" id="filter-sku" name="sku" list="filter-skus" />
            <datalist id="filter-skus">
              {skus.map(({ value, label }) => (
                <option key={value} value={value} label={label}></option>
              ))}
            </datalist>
          </dui-combobox>
          <div data-field="">
            <label htmlFor="filter-status">Status</label>
            <select id="filter-status" name="status" defaultValue="">
              <option value="">Any status</option>
              {statuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>
          <div>
            <button type="submit">Apply</button>
            <button type="reset">Reset</button>
          </div>
        </form>
        <p role="status" id="order-count">{plural(shownCount)}</p>
      </search>

      <label>
        <input type="checkbox" role="switch" id="orders-compact" checked={compact} onChange={(event) => setCompact(event.currentTarget.checked)} /> Compact table
      </label>

      <form id="bulk-orders" method="post" action="?" onSubmit={bulkAction}>
        <dui-table id="orders" className="stack" select-all-label="Select all orders" style={{ '--stack-gap': 'var(--dui-space-s)' } as CSSProperties}>
          <div className="cluster">
            <dui-toolbar role="toolbar" aria-label="Bulk actions">
              <button type="submit" name="action" value="ship" data-button="secondary" id="bulk-ship">Mark as shipped</button>
              <button type="submit" name="action" value="print" data-button="secondary" id="bulk-print">Print packing slips</button>
            </dui-toolbar>
            <p role="status" id="selection-count"></p>
          </div>
          <section data-scroll="inline" data-density={compact ? 'compact' : undefined} aria-labelledby="orders-caption" tabIndex={0} id="orders-region">
            <table data-table="" id="orders-table">
              <caption id="orders-caption">All orders</caption>
              <thead>
                <tr>
                  <td></td>
                  <th scope="col" data-table="sortable">Order</th>
                  <th scope="col" data-table="sortable">Customer</th>
                  <th scope="col" data-table="sortable">SKU</th>
                  <th scope="col" data-table="sortable number">Qty</th>
                  <th scope="col" data-table="sortable">Placed</th>
                  <th scope="col" data-table="sortable">Status</th>
                  <th scope="col" data-table="sortable number">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((order) => (
                  <tr key={order.id} hidden={!matches(order, filter)}>
                    <td>
                      <label>
                        <input type="checkbox" name="orders[]" value={order.id} onChange={(event) => event.currentTarget.checked && showOrder(order.id)} />
                        <span className="visually-hidden">Select order {order.id}</span>
                      </label>
                    </td>
                    <th scope="row"><a href={`?order=${order.id}`} onClick={(event) => openOrder(event, order.id, { drawer: true })}>{order.id}</a></th>
                    <td>{order.customer}</td>
                    <td>{order.sku}</td>
                    <td data-table="number">{order.qty}</td>
                    <td><time dateTime={order.date}>{order.placed}</time></td>
                    <td><span data-badge={order.tone}>{order.status}</span></td>
                    <td data-table="number">{order.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </dui-table>
      </form>
      <p role="status" id="bulk-result">{bulkResult}</p>
    </Layout>
  )
}
