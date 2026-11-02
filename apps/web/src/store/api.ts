import {
  type BaseQueryFn,
  createApi,
  type FetchArgs,
  fetchBaseQuery,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import type {
  AuthResponse,
  CreateUserInput,
  LoginInput,
  OrganizationDto,
  OrganizationSettingsInput,
  UpdateMeInput,
  UpdateUserInput,
  UserDto,
} from '@savdo/shared';
import { loggedIn, loggedOut, userUpdated } from './authSlice';

export const API_URL: string = import.meta.env.VITE_API_URL ?? '/api';

interface AuthRoot {
  auth: { accessToken: string | null };
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as AuthRoot).auth.accessToken;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

let refreshing: Promise<boolean> | null = null;

/**
 * Bitta vaqtda faqat bitta /auth/refresh (rotation tufayli parallel so'rovlar
 * bir-birini bekor qilmasligi uchun). Natija store'ga yoziladi.
 */
function refreshOnce(
  api: Parameters<typeof rawBaseQuery>[1],
  extra: Parameters<typeof rawBaseQuery>[2],
): Promise<boolean> {
  refreshing ??= (async () => {
    const r = await rawBaseQuery({ url: '/auth/refresh', method: 'POST' }, api, extra);
    if (r.data) {
      api.dispatch(loggedIn(r.data as AuthResponse));
      return true;
    }
    api.dispatch(loggedOut());
    return false;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/** 401 bo'lsa — bir marta /auth/refresh, keyin so'rovni qaytaradi; bo'lmasa logout (login'ga) */
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extra,
) => {
  const url = typeof args === 'string' ? args : args.url;
  if (url === '/auth/refresh') {
    const ok = await refreshOnce(api, extra);
    return ok ? { data: null } : { error: { status: 401, data: null } };
  }
  let result = await rawBaseQuery(args, api, extra);
  if (result.error?.status !== 401 || url.startsWith('/auth/')) return result;
  if (await refreshOnce(api, extra)) result = await rawBaseQuery(args, api, extra);
  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'Organization'],
  endpoints: (b) => ({
    login: b.mutation<AuthResponse, LoginInput>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(loggedIn(data));
        } catch {
          // xato komponentda ko'rsatiladi
        }
      },
    }),
    /** Sessiyani tiklash; natija (loggedIn/loggedOut) store'ga refreshOnce orqali yoziladi */
    refresh: b.mutation<null, void>({
      query: () => ({ url: '/auth/refresh', method: 'POST' }),
    }),
    logout: b.mutation<void, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          dispatch(loggedOut());
          dispatch(api.util.resetApiState());
        }
      },
    }),
    users: b.query<UserDto[], void>({
      query: () => '/users',
      providesTags: ['User'],
    }),
    createUser: b.mutation<UserDto, CreateUserInput>({
      query: (body) => ({ url: '/users', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),
    updateUser: b.mutation<UserDto, { id: string; body: UpdateUserInput }>({
      query: ({ id, body }) => ({ url: `/users/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['User'],
    }),
    updateMe: b.mutation<UserDto, UpdateMeInput>({
      query: (body) => ({ url: '/users/me', method: 'PATCH', body }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(userUpdated(data));
        } catch {
          // xato komponentda ko'rsatiladi
        }
      },
      invalidatesTags: ['User'],
    }),
    organization: b.query<OrganizationDto, void>({
      query: () => '/organization',
      providesTags: ['Organization'],
    }),
    updateOrganization: b.mutation<OrganizationDto, OrganizationSettingsInput>({
      query: (body) => ({ url: '/organization', method: 'PATCH', body }),
      invalidatesTags: ['Organization'],
    }),
  }),
});

export const {
  useLoginMutation,
  useRefreshMutation,
  useLogoutMutation,
  useUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useUpdateMeMutation,
  useOrganizationQuery,
  useUpdateOrganizationMutation,
} = api;

/** API xatosidan i18n kalitini oladi */
export function apiErrorKey(error: unknown): string {
  const e = error as FetchBaseQueryError | undefined;
  if (e && 'status' in e) {
    const msg = (e.data as { message?: unknown } | undefined)?.message;
    if (typeof msg === 'string' && msg.includes('.')) return msg;
    if (e.status === 401) return 'auth.invalidCredentials';
    if (e.status === 403) return 'errors.forbidden';
  }
  return 'errors.generic';
}
