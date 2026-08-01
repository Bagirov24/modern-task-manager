/**
 * Unit tests for the Axios singleton (api.ts) refresh-token logic.
 *
 * We mock axios adapters so no real network calls are made.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { api } from './api';
import { useAuthStore } from '../stores/authStore';

const mock = new MockAdapter(api);
const originalRefreshTokens = useAuthStore.getState().refreshTokens;
const originalLogout = useAuthStore.getState().logout;

beforeEach(() => {
  mock.reset();
  useAuthStore.setState({
    accessToken: 'valid-access-token',
    refreshToken: 'valid-refresh-token',
    isAuthenticated: true,
    refreshTokens: originalRefreshTokens,
    logout: originalLogout,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('api interceptors', () => {
  it('attaches Authorization header from store', async () => {
    mock.onGet('/api/v1/tasks/').reply(200, { tasks: [] });
    const response = await api.get('/api/v1/tasks/');
    expect(response.config.headers?.Authorization).toBe('Bearer valid-access-token');
  });

  it('returns 200 response without retry on success', async () => {
    mock.onGet('/api/v1/tasks/').reply(200, { tasks: [{ id: '1' }] });
    const response = await api.get('/api/v1/tasks/');
    expect(response.status).toBe(200);
    expect(response.data.tasks).toHaveLength(1);
  });

  it('silently refreshes on 401 and retries original request', async () => {
    // First call returns 401, refresh returns new tokens,
    // second call (retry) returns 200.
    mock
      .onGet('/api/v1/tasks/')
      .replyOnce(401)
      .onGet('/api/v1/tasks/')
      .replyOnce(200, { tasks: [] });

    const refreshSpy = vi.spyOn(useAuthStore.getState(), 'refreshTokens')
      .mockResolvedValue('new-access-token');

    const response = await api.get('/api/v1/tasks/');
    expect(refreshSpy).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
  });

  it('calls logout when refresh fails', async () => {
    mock.onGet('/api/v1/me').replyOnce(401);

    vi.spyOn(useAuthStore.getState(), 'refreshTokens')
      .mockRejectedValue(new Error('Refresh failed'));
    const logoutSpy = vi.spyOn(useAuthStore.getState(), 'logout');

    await expect(api.get('/api/v1/me')).rejects.toThrow();
    expect(logoutSpy).toHaveBeenCalledOnce();
  });

  it('does not retry the refresh endpoint itself on 401', async () => {
    mock.onPost('/api/v1/auth/refresh').replyOnce(401);
    const refreshSpy = vi.spyOn(useAuthStore.getState(), 'refreshTokens');

    await expect(api.post('/api/v1/auth/refresh', {})).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('queues concurrent 401s and replays with new token', async () => {
    mock
      .onGet('/api/v1/tasks/')
      .reply(401)
      .onGet('/api/v1/projects/')
      .reply(401);

    let refreshCallCount = 0;
    vi.spyOn(useAuthStore.getState(), 'refreshTokens').mockImplementation(async () => {
      refreshCallCount++;
      return 'new-token';
    });

    // Fire both requests simultaneously.
    await Promise.allSettled([
      api.get('/api/v1/tasks/'),
      api.get('/api/v1/projects/'),
    ]);

    // Refresh must be called exactly once despite two 401s.
    expect(refreshCallCount).toBe(1);
  });
});
