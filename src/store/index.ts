import { configureStore } from '@reduxjs/toolkit';
import { marketplaceApi } from './api';

export const store = configureStore({
  reducer: {
    [marketplaceApi.reducerPath]: marketplaceApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(marketplaceApi.marketplaceApi.middleware),
});

// For future slice additions (auth, ui, etc.)
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
