<script setup>
import { computed, ref } from 'vue'
import '../../../web-components/dui-combobox.js'
import '../../../web-components/dui-table.js'
import '../../../web-components/dui-toolbar.js'
import Layout from './Layout.vue'
import { customers, orders, skus, statuses } from './orderData.js'

const noFilter = { customer: '', sku: '', status: '' }

const matches = (order, filter) =>
  order.customer.toLowerCase().includes(filter.customer.trim().toLowerCase()) &&
  order.sku.toLowerCase().includes(filter.sku.trim().toLowerCase()) &&
  (!filter.status || order.status === filter.status)

const plural = (count) => `${count} ${count === 1 ? 'order' : 'orders'}`

// The order in the address bar (a link opened in a new tab) is the one shown.
const requested = () => {
  const id = new URLSearchParams(location.search).get('order')
  return orders.some((order) => order.id === id) ? id : orders[0].id
}

const filter = ref(noFilter)
const compact = ref(false)
const selectedId = ref(requested())
const announcement = ref('')
const shipped = ref([])
const bulkResult = ref('')

// Every row stays rendered (filtered rows are hidden), so <dui-table> can sort and select them in place.
const rows = computed(() => orders.map((order) => (shipped.value.includes(order.id) ? { ...order, status: 'Shipped', tone: 'neutral' } : order)))
const shownCount = computed(() => rows.value.filter((order) => matches(order, filter.value)).length)
const selected = computed(() => rows.value.find((order) => order.id === selectedId.value) ?? rows.value[0])

function showOrder(id) {
  selectedId.value = id
  announcement.value = `Order ${id} shown in Order details.`
}

// A link to ?order=…: show that order here instead of loading the page again, and open the drawer
// when the details sidebar does not fit beside main (<dui-app-shell>'s isDrawer() and show()).
function openOrder(event, id, { drawer = false } = {}) {
  if (event.ctrlKey || event.metaKey || event.shiftKey) return
  event.preventDefault()
  showOrder(id)
  const shell = document.querySelector('dui-app-shell')
  if (drawer && shell?.isDrawer('end')) shell.show('end')
}

function applyFilter(event) {
  const data = new FormData(event.currentTarget)
  filter.value = {
    customer: String(data.get('customer') ?? ''),
    sku: String(data.get('sku') ?? ''),
    status: String(data.get('status') ?? ''),
  }
}

// Without this handler the form posts the checked orders with action=ship or print.
function bulkAction(event) {
  const ids = new FormData(event.currentTarget).getAll('orders[]').map(String)
  if (event.submitter?.value === 'ship') {
    shipped.value = [...new Set([...shipped.value, ...ids])]
    bulkResult.value = `${plural(ids.length)} marked as shipped.`
  } else if (event.submitter?.value === 'print') {
    bulkResult.value = `Packing slips for ${plural(ids.length)} sent to the printer.`
  }
}
</script>

<template>
  <Layout current="orders">
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
      <form method="get" id="order-filters" @submit.prevent="applyFilter" @reset="filter = noFilter">
        <dui-combobox>
          <label for="filter-customer">Customer</label>
          <input type="text" id="filter-customer" name="customer" list="filter-customers" />
          <datalist id="filter-customers">
            <option v-for="customer in customers" :key="customer" :value="customer"></option>
          </datalist>
        </dui-combobox>
        <dui-combobox>
          <label for="filter-sku">SKU</label>
          <input type="text" id="filter-sku" name="sku" list="filter-skus" />
          <datalist id="filter-skus">
            <option v-for="sku in skus" :key="sku.value" :value="sku.value" :label="sku.label"></option>
          </datalist>
        </dui-combobox>
        <div data-field="">
          <label for="filter-status">Status</label>
          <select id="filter-status" name="status">
            <option value="" selected>Any status</option>
            <option v-for="status in statuses" :key="status">{{ status }}</option>
          </select>
        </div>
        <div>
          <button type="submit">Apply</button>
          <button type="reset">Reset</button>
        </div>
      </form>
      <p role="status" id="order-count">{{ plural(shownCount) }}</p>
    </search>

    <label>
      <input type="checkbox" role="switch" id="orders-compact" v-model="compact" /> Compact table
    </label>

    <form id="bulk-orders" method="post" action="?" @submit.prevent="bulkAction">
      <dui-table id="orders" class="stack" select-all-label="Select all orders" style="--stack-gap: var(--dui-space-s)">
        <div class="cluster">
          <dui-toolbar role="toolbar" aria-label="Bulk actions">
            <button type="submit" name="action" value="ship" data-button="secondary" id="bulk-ship">Mark as shipped</button>
            <button type="submit" name="action" value="print" data-button="secondary" id="bulk-print">Print packing slips</button>
          </dui-toolbar>
          <p role="status" id="selection-count"></p>
        </div>
        <section data-scroll="inline" :data-density="compact ? 'compact' : undefined" aria-labelledby="orders-caption" tabindex="0" id="orders-region">
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
              <tr v-for="order in rows" :key="order.id" :hidden="!matches(order, filter)">
                <td>
                  <label>
                    <input type="checkbox" name="orders[]" :value="order.id" @change="$event.currentTarget.checked && showOrder(order.id)" />
                    <span class="visually-hidden">Select order {{ order.id }}</span>
                  </label>
                </td>
                <th scope="row"><a :href="`?order=${order.id}`" @click="openOrder($event, order.id, { drawer: true })">{{ order.id }}</a></th>
                <td>{{ order.customer }}</td>
                <td>{{ order.sku }}</td>
                <td data-table="number">{{ order.qty }}</td>
                <td><time :datetime="order.date">{{ order.placed }}</time></td>
                <td><span :data-badge="order.tone">{{ order.status }}</span></td>
                <td data-table="number">{{ order.total }}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </dui-table>
    </form>
    <p role="status" id="bulk-result">{{ bulkResult }}</p>

    <template #aux>
      <aside id="app-aux" aria-label="Order details" class="stack">
        <div data-list-detail="">
          <nav aria-label="Orders">
            <ul>
              <li v-for="order in rows" :key="order.id">
                <a :href="`?order=${order.id}`" :aria-current="order.id === selected.id ? 'page' : undefined" @click="openOrder($event, order.id)">
                  Order {{ order.id }} <small>{{ order.customer }} · {{ order.total }}</small>
                </a>
              </li>
            </ul>
          </nav>
          <section aria-labelledby="aux-title" tabindex="0">
            <h2 id="aux-title">Order {{ selected.id }}</h2>
            <p><span :data-badge="selected.tone" id="aux-status">{{ selected.status }}</span></p>
            <dl>
              <dt>Customer</dt>
              <dd id="aux-customer">{{ selected.customer }}</dd>
              <dt>SKU</dt>
              <dd id="aux-sku">{{ selected.sku }}, {{ selected.skuLabel }}</dd>
              <dt>Quantity</dt>
              <dd id="aux-qty">{{ selected.qty }}</dd>
              <dt>Placed</dt>
              <dd id="aux-placed"><time :datetime="selected.date">{{ selected.placed }}</time></dd>
              <dt>Total</dt>
              <dd id="aux-total">{{ selected.total }}</dd>
              <dt>Ship to</dt>
              <dd id="aux-ship">{{ selected.shipTo }}</dd>
              <dt>Carrier</dt>
              <dd id="aux-carrier">{{ selected.carrier }}</dd>
            </dl>
            <p class="cluster">
              <a :href="`?order=${selected.id}&view=edit`" id="aux-open" data-button="">Open order</a>
              <a :href="`?order=${selected.id}&view=print`" id="aux-print" data-button="">Print</a>
            </p>
            <p role="status" class="visually-hidden" id="aux-announce">{{ announcement }}</p>
          </section>
        </div>
      </aside>
    </template>
  </Layout>
</template>
