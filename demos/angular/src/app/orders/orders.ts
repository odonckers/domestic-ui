import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import '../../../../../web-components/dui-combobox.js';
import { customers, orders, skus, statuses, type Order } from './order-data';

const noFilter = { customer: '', sku: '', status: 'all' };

const matches = (order: Order, filter: typeof noFilter) =>
  order.customer.toLowerCase().includes(filter.customer.trim().toLowerCase()) &&
  order.sku.toLowerCase().includes(filter.sku.trim().toLowerCase()) &&
  (filter.status === 'all' || order.status === filter.status);

@Component({
  // The page's host element is the <main> landmark itself, so the markup matches
  // the other demos (no wrapper element between <main> and its content).
  selector: 'main[app-orders-page]',
  host: { id: 'main' },
  templateUrl: './orders.html',
  // <dui-combobox> is a custom element (web-components/dui-combobox.js), not an Angular component.
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class OrdersPage {
  protected readonly orders = orders;
  protected readonly customers = customers;
  protected readonly skus = skus;
  protected readonly statuses = statuses;

  protected readonly summary = ['Open', 'Packed', 'Shipped', 'Delivered'].map((status) => ({
    title: status,
    count: orders.filter((order) => order.status === status).length,
  }));

  protected readonly filter = signal(noFilter);
  protected readonly compact = signal(false);
  protected readonly selectedId = signal(orders[0].id);

  protected readonly shown = computed(() => orders.filter((order) => matches(order, this.filter())));
  protected readonly selected = computed(() => orders.find((order) => order.id === this.selectedId()) ?? orders[0]);

  protected applyFilter(event: SubmitEvent) {
    event.preventDefault();
    const data = new FormData(event.target as HTMLFormElement);
    this.filter.set({
      customer: String(data.get('customer') ?? ''),
      sku: String(data.get('sku') ?? ''),
      status: String(data.get('status') ?? 'all'),
    });
  }

  protected resetFilter() {
    this.filter.set(noFilter);
  }

  protected toggleCompact(event: Event) {
    this.compact.set((event.target as HTMLInputElement).checked);
  }
}
