export const DELIVERY_CENTS = 1495;
export const FREE_DELIVERY_OVER_CENTS = 15000;
export const deliveryFor = (subtotal: number) => (subtotal >= FREE_DELIVERY_OVER_CENTS ? 0 : DELIVERY_CENTS);
