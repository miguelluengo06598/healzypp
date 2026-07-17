import { compareArrays } from "@/lib/utils";
import { eurosToCents, centsToEuros } from "@/lib/money";
import { Discount } from "@/types/product.types";
import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

/** Precio unitario con descuento aplicado, en céntimos (entero, sin drift). */
const itemAdjustedUnitCents = (item: CartItem): number => {
  const priceCents = eurosToCents(item.price);
  if (item.discount.percentage > 0) {
    return Math.round(priceCents * (1 - item.discount.percentage / 100));
  }
  if (item.discount.amount > 0) {
    return priceCents - eurosToCents(item.discount.amount);
  }
  return priceCents;
};

export type RemoveCartItem = {
  id: number;
  attributes: string[];
};

export type CartItem = {
  id: number;
  name: string;
  srcUrl: string;
  price: number;
  attributes: string[];
  discount: Discount;
  quantity: number;
};

export type Cart = {
  items: CartItem[];
  totalQuantities: number;
};

// Define a type for the slice state
interface CartsState {
  cart: Cart | null;
  totalPrice: number;
  adjustedTotalPrice: number;
  action: "update" | "add" | "delete" | null;
}

// Define the initial state using that type
const initialState: CartsState = {
  cart: null,
  totalPrice: 0,
  adjustedTotalPrice: 0,
  action: null,
};

// Los totales se recalculan SIEMPRE desde los items, sumando en céntimos
// (enteros) y convirtiendo a euros solo al final. El acumulado incremental
// anterior (state.totalPrice + price * qty en float) producía valores tipo
// 49.98999999999999 que llegaban crudos a la UI.
const recomputeTotals = (state: CartsState) => {
  const items = state.cart?.items ?? [];
  let totalCents = 0;
  let adjustedCents = 0;
  for (const item of items) {
    totalCents += eurosToCents(item.price) * item.quantity;
    adjustedCents += itemAdjustedUnitCents(item) * item.quantity;
  }
  state.totalPrice = centsToEuros(totalCents);
  state.adjustedTotalPrice = centsToEuros(adjustedCents);
};

export const cartsSlice = createSlice({
  name: "carts",
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<CartItem>) => {
      // if cart is empty then add
      if (state.cart === null) {
        state.cart = {
          items: [action.payload],
          totalQuantities: action.payload.quantity,
        };
        recomputeTotals(state);
        return;
      }

      // check item in cart
      const isItemInCart = state.cart.items.find(
        (item) =>
          action.payload.id === item.id &&
          compareArrays(action.payload.attributes, item.attributes)
      );

      if (isItemInCart) {
        state.cart = {
          ...state.cart,
          items: state.cart.items.map((eachCartItem) => {
            if (
              eachCartItem.id === action.payload.id
                ? !compareArrays(
                    eachCartItem.attributes,
                    isItemInCart.attributes
                  )
                : eachCartItem.id !== action.payload.id
            )
              return eachCartItem;

            return {
              ...isItemInCart,
              quantity: action.payload.quantity + isItemInCart.quantity,
            };
          }),
          totalQuantities: state.cart.totalQuantities + action.payload.quantity,
        };
        recomputeTotals(state);
        return;
      }

      state.cart = {
        ...state.cart,
        items: [...state.cart.items, action.payload],
        totalQuantities: state.cart.totalQuantities + action.payload.quantity,
      };
      recomputeTotals(state);
    },
    removeCartItem: (state, action: PayloadAction<RemoveCartItem>) => {
      if (state.cart === null) return;

      // check item in cart
      const isItemInCart = state.cart.items.find(
        (item) =>
          action.payload.id === item.id &&
          compareArrays(action.payload.attributes, item.attributes)
      );

      if (isItemInCart) {
        state.cart = {
          ...state.cart,
          items: state.cart.items
            .map((eachCartItem) => {
              if (
                eachCartItem.id === action.payload.id
                  ? !compareArrays(
                      eachCartItem.attributes,
                      isItemInCart.attributes
                    )
                  : eachCartItem.id !== action.payload.id
              )
                return eachCartItem;

              return {
                ...isItemInCart,
                quantity: eachCartItem.quantity - 1,
              };
            })
            .filter((item) => item.quantity > 0),
          totalQuantities: state.cart.totalQuantities - 1,
        };
        recomputeTotals(state);
      }
    },
    remove: (
      state,
      action: PayloadAction<RemoveCartItem & { quantity: number }>
    ) => {
      if (!state.cart) return;

      // check item in cart
      const isItemInCart = state.cart.items.find(
        (item) =>
          action.payload.id === item.id &&
          compareArrays(action.payload.attributes, item.attributes)
      );

      if (!isItemInCart) return;

      state.cart = {
        ...state.cart,
        items: state.cart.items.filter((pItem) => {
          return pItem.id === action.payload.id
            ? !compareArrays(pItem.attributes, isItemInCart.attributes)
            : pItem.id !== action.payload.id;
        }),
        totalQuantities: state.cart.totalQuantities - isItemInCart.quantity,
      };
      recomputeTotals(state);
    },
    clearCart: (state) => {
      state.cart = null;
      state.totalPrice = 0;
      state.adjustedTotalPrice = 0;
      state.action = null;
    },
  },
});

export const { addToCart, removeCartItem, remove, clearCart } =
  cartsSlice.actions;

export default cartsSlice.reducer;
