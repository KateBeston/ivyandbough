export const DELIVERY_CENTS = 1495;
export const FREE_DELIVERY_OVER_CENTS = 15000;
export const deliveryFor = (subtotal: number) => (subtotal >= FREE_DELIVERY_OVER_CENTS ? 0 : DELIVERY_CENTS);
const money = (cents: number) => `$${cents % 100 ? (cents / 100).toFixed(2) : cents / 100}`;
export const DELIVERY_SUMMARY = `Standard delivery is ${money(DELIVERY_CENTS)}, and it's free on orders over ${money(FREE_DELIVERY_OVER_CENTS)}.`;
