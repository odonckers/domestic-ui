// Sample orders for the Orders view: the table, the order list and Order details all read this list.
export const orders = [
	{ id: "HB-1048", customer: "Maple Street Bakery", sku: "HB-MUG-12", skuLabel: "Stoneware mug, 12 oz", qty: 24, status: "Open", tone: "warning", total: "$216.00", date: "2026-11-20", placed: "20 November 2026", shipTo: "214 Maple Street, Portland, OR", carrier: "Not shipped yet" },
	{ id: "HB-1047", customer: "Northwind Hardware", sku: "HB-BASKET-L", skuLabel: "Woven laundry basket, large", qty: 6, status: "Packed", tone: "accent", total: "$171.00", date: "2026-11-19", placed: "19 November 2026", shipTo: "88 Harbor Road, Tacoma, WA", carrier: "UPS Ground" },
	{ id: "HB-1046", customer: "Harbor Lane Café", sku: "HB-JAR-1L", skuLabel: "Glass storage jar, 1 litre", qty: 18, status: "Shipped", tone: "neutral", total: "$126.00", date: "2026-11-18", placed: "18 November 2026", shipTo: "5 Harbor Lane, Astoria, OR", carrier: "USPS Priority Mail" },
	{ id: "HB-1045", customer: "Bluebell Florists", sku: "HB-POT-TC", skuLabel: "Terracotta plant pot", qty: 40, status: "Open", tone: "warning", total: "$260.00", date: "2026-11-18", placed: "18 November 2026", shipTo: "1730 Bluebell Avenue, Eugene, OR", carrier: "Not shipped yet" },
	{ id: "HB-1044", customer: "Riverside Dental", sku: "HB-TOWEL-04", skuLabel: "Linen tea towels, set of 4", qty: 10, status: "Delivered", tone: "success", total: "$185.00", date: "2026-11-16", placed: "16 November 2026", shipTo: "402 Riverside Drive, Salem, OR", carrier: "UPS Ground" },
	{ id: "HB-1043", customer: "Oakridge Primary School", sku: "HB-BOARD-OAK", skuLabel: "Oak chopping board", qty: 12, status: "Shipped", tone: "neutral", total: "$336.00", date: "2026-11-15", placed: "15 November 2026", shipTo: "60 Oakridge Road, Bend, OR", carrier: "FedEx Ground" },
	{ id: "HB-1042", customer: "Pine & Co. Interiors", sku: "HB-THROW-WL", skuLabel: "Wool throw blanket", qty: 5, status: "Cancelled", tone: "danger", total: "$345.00", date: "2026-11-14", placed: "14 November 2026", shipTo: "19 Pine Street, Seattle, WA", carrier: "Cancelled" },
	{ id: "HB-1041", customer: "Summit Climbing Gym", sku: "HB-CANDLE-08", skuLabel: "Soy candle, 8 oz", qty: 30, status: "Delivered", tone: "success", total: "$255.00", date: "2026-11-12", placed: "12 November 2026", shipTo: "900 Summit Way, Boise, ID", carrier: "USPS Priority Mail" },
];

export type Order = (typeof orders)[number];

// The typeahead suggestions: every customer and SKU on an order, plus a few more.
export const customers = [
	"Bluebell Florists",
	"Copperfield Books",
	"Harbor Lane Café",
	"Lakeside Hotel",
	"Maple Street Bakery",
	"Northwind Hardware",
	"Oakridge Primary School",
	"Pine & Co. Interiors",
	"Riverside Dental",
	"Summit Climbing Gym",
];

export const skus = [
	{ value: "HB-BASKET-L", label: "Woven laundry basket, large" },
	{ value: "HB-BOARD-OAK", label: "Oak chopping board" },
	{ value: "HB-BOWL-06", label: "Stoneware bowl, 6 in" },
	{ value: "HB-CANDLE-08", label: "Soy candle, 8 oz" },
	{ value: "HB-JAR-1L", label: "Glass storage jar, 1 litre" },
	{ value: "HB-MUG-12", label: "Stoneware mug, 12 oz" },
	{ value: "HB-MUG-16", label: "Stoneware mug, 16 oz" },
	{ value: "HB-POT-TC", label: "Terracotta plant pot" },
	{ value: "HB-THROW-WL", label: "Wool throw blanket" },
	{ value: "HB-TOWEL-04", label: "Linen tea towels, set of 4" },
];

export const statuses = ["Open", "Packed", "Shipped", "Delivered", "Cancelled"];
