import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { createMigrate, persistReducer, persistStore } from "redux-persist";
import storage from "@/components/storage";
import productsReducer from "./features/products/productsSlice";
import cartsReducer from "./features/carts/cartsSlice";

// Los carritos v1 guardan los items sin `sku`, y su nombre de pack se repite
// entre productos, así que no se pueden re-resolver sin ambigüedad: intentarlo
// reintroduciría el fallo de cobrar el producto equivocado. Se descartan a
// propósito — es preferible un carrito vacío a un cobro incorrecto.
//
// Tiene que ser createMigrate y no un `migrate` propio que devuelva siempre
// undefined: migrate se ejecuta en CADA rehidratación, así que devolver
// undefined sin mirar la versión vaciaría el carrito continuamente, no solo
// una vez. createMigrate solo aplica la migración si la versión guardada es
// anterior a la 2.
const migrations = {
  2: () => undefined,
};

const persistConfig = {
  key: "root",
  storage,
  // v2: los items del carrito llevan `sku`, el identificador único del pack.
  version: 2,
  whitelist: ["carts"],
  migrate: createMigrate(migrations as never, { debug: false }),
};

const rootReducer = combineReducers({
  products: productsReducer,
  carts: cartsReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const makeStore = () => {
  const store = configureStore({
    reducer: persistedReducer,
    devTools: typeof process !== "undefined" && process.env.NODE_ENV === "development",
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  });

  const persistor = persistStore(store);
  return { store, persistor };
};

const store = makeStore().store;

// Infer the type of the store
export type AppStore = typeof store;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export { store };
