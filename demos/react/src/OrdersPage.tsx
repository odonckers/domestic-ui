import { useState, type CSSProperties, type FormEvent } from 'react'
import '../../../web-components/dui-combobox.js'
import Layout from './Layout.tsx'
import { customers, orders, skus, statuses, type Order } from './orderData.ts'

const summary = ['Open', 'Packed', 'Shipped', 'Delivered'].map((status) => ({
  title: status,
  count: orders.filter((order) => order.status === status).length,
}))

const noFilter = { customer: '', sku: '', status: 'all' }

const matches = (order: Order, filter: typeof noFilter) =>
  order.customer.toLowerCase().includes(filter.customer.trim().toLowerCase()) &&
  order.sku.toLowerCase().includes(filter.sku.trim().toLowerCase()) &&
  (filter.status === 'all' || order.status === filter.status)

export default function OrdersPage() {
  const [filter, setFilter] = useState(noFilter)
  const [compact, setCompact] = useState(false)
  const [selectedId, setSelectedId] = useState(orders[0].id)

  const shown = orders.filter((order) => matches(order, filter))
  const selected = orders.find((order) => order.id === selectedId) ?? orders[0]

  function applyFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setFilter({
      customer: String(data.get('customer') ?? ''),
      sku: String(data.get('sku') ?? ''),
      status: String(data.get('status') ?? 'all'),
    })
  }

  return (
    <Layout current="orders">
      <h1>Orders</h1>
      <p data-text="lead">Every order in the warehouse queue: who it is for, what to pick, and where it stands.</p>

      <div className="grid" style={{ '--grid-min': '12rem' } as CSSProperties} id="orders-summary">
        {summary.map(({ title, count }) => (
          <article key={title}>
            <h2>{title}</h2>
            <p>{count}</p>
          </article>
        ))}
      </div>

      <section aria-labelledby="orders-title">
        <h2 id="orders-title">All orders</h2>

        <form className="stack" method="get" id="orders-filter" onSubmit={applyFilter} onReset={() => setFilter(noFilter)}>
          <div className="grid" style={{ '--grid-min': '14rem' } as CSSProperties}>
            <dui-combobox>
              <label htmlFor="orders-customer">Customer</label>
              <input type="text" id="orders-customer" name="customer" list="orders-customer-options" />
              <datalist id="orders-customer-options">
                {customers.map((customer) => (
                  <option key={customer} value={customer}></option>
                ))}
              </datalist>
            </dui-combobox>
            <dui-combobox>
              <label htmlFor="orders-sku">SKU</label>
              <input type="text" id="orders-sku" name="sku" list="orders-sku-options" />
              <datalist id="orders-sku-options">
                {skus.map(({ value, label }) => (
                  <option key={value} value={value} label={label}></option>
                ))}
              </datalist>
            </dui-combobox>
            <div data-field="">
              <label htmlFor="orders-status">Status</label>
              <select id="orders-status" name="status" defaultValue="all">
                <option value="all">All statuses</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="cluster">
            <button type="submit" data-button="small">Apply filter</button>
            <button type="reset" data-button="quiet small">Reset</button>
          </div>
          <p role="status" id="orders-count">Showing {shown.length} {shown.length === 1 ? 'order' : 'orders'}</p>
        </form>

        <label>
          <input type="checkbox" role="switch" id="orders-compact" checked={compact} onChange={(event) => setCompact(event.currentTarget.checked)} /> Compact table
        </label>

        <section data-scroll="inline" data-density={compact ? 'compact' : 'comfortable'} aria-labelledby="orders-caption" tabIndex={0} id="orders-table">
          <table>
            <caption id="orders-caption">Recent orders</caption>
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Customer</th>
                <th scope="col">SKU</th>
                <th scope="col">Qty</th>
                <th scope="col">Status</th>
                <th scope="col">Total</th>
              </tr>
            </thead>
            <tbody id="orders-rows">
              {shown.map(({ id, customer, sku, qty, status, tone, total }) => (
                <tr key={id}>
                  <th scope="row">{id}</th>
                  <td>{customer}</td>
                  <td>{sku}</td>
                  <td>{qty}</td>
                  <td><span data-badge={tone}>{status}</span></td>
                  <td>{total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>

      <section aria-labelledby="detail-title">
        <h2 id="detail-title">Order details</h2>
        <nav aria-label="Order list">
          <ul className="stack" style={{ '--stack-gap': 'var(--dui-space-2xs)' } as CSSProperties} id="order-list">
            {orders.map(({ id, customer }) => (
              <li key={id}>
                <button type="button" data-button="quiet" value={id} aria-current={id === selected.id ? 'true' : undefined} onClick={() => setSelectedId(id)}>
                  {id} · {customer}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <article aria-labelledby="order-detail-title">
          <h3 id="order-detail-title">Order {selected.id}</h3>
          <dl id="order-detail">
            <dt>Customer</dt>
            <dd>{selected.customer}</dd>
            <dt>SKU</dt>
            <dd>{selected.sku}, {selected.skuLabel}</dd>
            <dt>Quantity</dt>
            <dd>{selected.qty}</dd>
            <dt>Status</dt>
            <dd><span data-badge={selected.tone}>{selected.status}</span></dd>
            <dt>Total</dt>
            <dd>{selected.total}</dd>
            <dt>Placed</dt>
            <dd><time dateTime={selected.date}>{selected.placed}</time></dd>
          </dl>
        </article>
      </section>
    </Layout>
  )
}
