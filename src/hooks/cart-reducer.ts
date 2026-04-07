export type CartItem = {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string | null;
};

export type CartState = CartItem[];

export function addItem(
  state: CartState,
  item: Omit<CartItem, 'quantity'>,
): CartState {
  const index = state.findIndex((i) => i.menu_item_id === item.menu_item_id);
  if (index === -1) {
    return [...state, { ...item, quantity: 1 }];
  }
  return state.map((i, idx) =>
    idx === index ? { ...i, quantity: i.quantity + 1 } : i,
  );
}

export function decrementItem(
  state: CartState,
  menuItemId: string,
): CartState {
  const index = state.findIndex((i) => i.menu_item_id === menuItemId);
  if (index === -1) return state;
  const target = state[index];
  if (target.quantity <= 1) {
    return state.filter((_, idx) => idx !== index);
  }
  return state.map((i, idx) =>
    idx === index ? { ...i, quantity: i.quantity - 1 } : i,
  );
}

export function removeItem(state: CartState, menuItemId: string): CartState {
  const index = state.findIndex((i) => i.menu_item_id === menuItemId);
  if (index === -1) return state;
  return state.filter((_, idx) => idx !== index);
}

export function calcTotals(state: CartState): {
  totalQuantity: number;
  totalAmount: number;
} {
  let totalQuantity = 0;
  let totalAmount = 0;
  for (const item of state) {
    totalQuantity += item.quantity;
    totalAmount += item.price * item.quantity;
  }
  return { totalQuantity, totalAmount };
}
