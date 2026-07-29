/**
 * Zustand auth store.
 *
 * Persists access + refresh tokens to localStorage so the user
 * stays logged in after a page reload.
 *
 * NOTE: Access tokens in localStorage are accessible to JS running on the
 * page. For apps with strict XSS requirements, store the refresh token in
 * an httpOnly cookie instead. This implementation matches the current
 * backend which does not set cookies.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  /** Store tokens received after login. */
  setTokens: (accessToken: string, refreshToken: string) => void;

  /** Exchange current refresh token for a new token pair.
   *  Returns the new access token string on success.
   *  Throws on failure (caller should log the user out). */
  refreshTokens: () => Promise<string>;

  /** Clear all auth state and tokens. */
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setTokens(accessToken, refreshToken) {
        set({ accessToken, refreshToken, isAuthenticated: true });
      },

      async refreshTokens() {
        const { refreshToken } = get();
        if (!refreshToken) throw new Error('No refresh token available');

        const response = await axios.post<{
          access_token: string;
          refresh_token: string;
        }>(
          `${BASE_URL}/api/v1/auth/refresh`,
          { refresh_token: refreshToken },
          // Plain axios — not the api singleton — to avoid interceptor loops.
          { headers: { 'Content-Type': 'application/json' } },
        );

        const { access_token, refresh_token } = response.data;
        set({
          accessToken: access_token,
          refreshToken: refresh_token,
          isAuthenticated: true,
        });
        return access_token;
      },

      logout() {
        set({ accessToken: null, refreshToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
      // Only persist tokens — not transient state.
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
