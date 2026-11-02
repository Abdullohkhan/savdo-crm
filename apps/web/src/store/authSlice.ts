import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthResponse, UserDto } from '@savdo/shared';

/** Access token faqat xotirada (localStorage'da EMAS). Refresh — httpOnly cookie. */
export interface AuthState {
  accessToken: string | null;
  user: UserDto | null;
  /** Ilova ochilganda sessiya tiklanishi tekshirildimi */
  initialized: boolean;
}

const initialState: AuthState = { accessToken: null, user: null, initialized: false };

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loggedIn(state, a: PayloadAction<AuthResponse>) {
      state.accessToken = a.payload.accessToken;
      state.user = a.payload.user;
      state.initialized = true;
    },
    userUpdated(state, a: PayloadAction<UserDto>) {
      state.user = a.payload;
    },
    loggedOut(state) {
      state.accessToken = null;
      state.user = null;
      state.initialized = true;
    },
  },
});

export const { loggedIn, userUpdated, loggedOut } = authSlice.actions;
