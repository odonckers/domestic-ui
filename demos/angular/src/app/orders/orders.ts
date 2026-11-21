import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import '../../../../../web-components/dui-combobox.js';
import '../../../../../web-components/dui-table.js';
import '../../../../../web-components/dui-toolbar.js';
import { AppBar } from '../shell/app-bar';
import { AppNav } from '../shell/app-nav';
import { customers, orders, skus, statuses, type Order } from './order-data';

const noFilter = { customer: '', sku: '', status: '' };

const matches = (order: Order, filter: typeof noFilter) =>
  order.customer.toLowerCase().includes(filter.customer.trim().toLowerCase()) &&
  order.sku.toLowerCase().includes(filter.sku.trim().toLowerCase()) &&
  (!filter.status || order.status === filter.status);

const plural = (count: number) => `${count} ${count === 1 ? 'order' : 'orders'}`;

// The part of <dui-app-shell> (web-components/dui-app-shell.js) this page calls.
type AppShell = HTMLElement & { isDrawer(edge: 'start' | 'end'): boolean; show(edge: 'start' | 'end'): void };

@Component({
  // The page's host element is the app shell itself, so <main> and the order details <aside> are its
  // direct children as in the other demos (no wrapper element between the shell and its landmarks).
  selector: 'dui-app-shell[app-orders-page]',
  host: { 'data-app-shell': '' },
  imports: [AppBar, AppNav, RouterLink],
  templateUrl: './orders.html',
  // The dui-* tags are custom elements (web-components/), not Angular components.
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class OrdersPage {
  protected readonly customers = customers;
  protected readonly skus = skus;
  protected readonly statuses = statuses;
  protected readonly plural = plural;

  protected readonly filter = signal(noFilter);
  protected readonly compact = signal(false);
  // The order in the address bar (a link opened in a new tab) is the one shown.
  protected readonly selectedId = signal(inject(ActivatedRoute).snapshot.queryParamMap.get('order') ?? orders[0].id);
  protected readonly announcement = signal('');
  protected readonly shipped = signal<string[]>([]);
  protected readonly bulkResult = signal('');

  // Every row stays rendered (filtered rows are hidden), so <dui-table> can sort and select them in place.
  protected readonly rows = computed(() =>
    orders.map((order) => (this.shipped().includes(order.id) ? { ...order, status: 'Shipped', tone: 'neutral' } : order)),
  );
  protected readonly shownCount = computed(() => this.rows().filter((order) => matches(order, this.filter())).length);
  protected readonly selected = computed(() => this.rows().find((order) => order.id === this.selectedId()) ?? this.rows()[0]);

  protected matches(order: Order) {
    return matches(order, this.filter());
  }

  protected showOrder(id: string) {
    this.selectedId.set(id);
    this.announcement.set(`Order ${id} shown in Order details.`);
  }

  // A link to ?order=…: show that order here instead of loading the page again, and open the drawer
  // when the details sidebar does not fit beside main.
  protected openOrder(event: MouseEvent, id: string, drawer = false) {
    if (event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    this.showOrder(id);
    const shell = document.querySelector<AppShell>('dui-app-shell');
    if (drawer && shell?.isDrawer('end')) shell.show('end');
  }

  protected selectRow(event: Event, id: string) {
    if ((event.target as HTMLInputElement).checked) this.showOrder(id);
  }

  protected applyFilter(event: SubmitEvent) {
    event.preventDefault();
    const data = new FormData(event.target as HTMLFormElement);
    this.filter.set({
      customer: String(data.get('customer') ?? ''),
      sku: String(data.get('sku') ?? ''),
      status: String(data.get('status') ?? ''),
    });
  }

  protected resetFilter() {
    this.filter.set(noFilter);
  }

  protected toggleCompact(event: Event) {
    this.compact.set((event.target as HTMLInputElement).checked);
  }

  // Without this handler the form posts the checked orders with action=ship or print.
  protected bulkAction(event: SubmitEvent) {
    event.preventDefault();
    const submitter = event.submitter as HTMLButtonElement | null;
    const ids = new FormData(event.target as HTMLFormElement).getAll('orders[]').map(String);
    if (submitter?.value === 'ship') {
      this.shipped.update((before) => [...new Set([...before, ...ids])]);
      this.bulkResult.set(`${plural(ids.length)} marked as shipped.`);
    } else if (submitter?.value === 'print') {
      this.bulkResult.set(`Packing slips for ${plural(ids.length)} sent to the printer.`);
    }
  }
}
