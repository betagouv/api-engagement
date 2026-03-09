import { expect, type Page } from "@playwright/test";

export const PUBLISHER_ID = "pub-test";

export const MOCK_USER = {
  id: "user-test",
  firstname: "Test",
  lastname: "User",
  email: "test-user@example.com",
  role: "user",
  publishers: [PUBLISHER_ID],
};

export const MOCK_PUBLISHER = {
  id: PUBLISHER_ID,
  _id: PUBLISHER_ID,
  name: "Test Publisher",
  hasApiRights: true,
  hasWidgetRights: true,
  hasCampaignRights: true,
  moderator: true,
  isAnnonceur: true, // flux = "to" — enables Performance (GlobalAnnounce) + Settings Flux
  publishers: [],
};

const MOCK_TOKEN = "mock-token-refreshed";

const API_URL = "http://localhost:4000";

type Route = { method: string; path: string; response: object; status?: number };

/**
 * Routes called by shared layouts on all protected pages:
 * - ProtectedLayout → GET /user/refresh
 * - PublisherSyncLayout + Nav → POST /publisher/search
 * - Header NotificationMenu (user) → POST /warning/search + GET /warning/state
 */
const BASE_ROUTES: Route[] = [
  {
    method: "GET",
    path: "/user/refresh",
    response: { ok: true, data: { user: MOCK_USER, publisher: MOCK_PUBLISHER, token: MOCK_TOKEN } },
  },
  {
    method: "POST",
    path: "/publisher/search",
    response: { ok: true, data: [MOCK_PUBLISHER], total: 1 },
  },
  {
    method: "POST",
    path: "/warning/search",
    response: { ok: true, data: [] },
  },
  {
    method: "GET",
    path: "/warning/state",
    response: { ok: true, data: { up: true, upToDate: true, last: null } },
  },
];

/**
 * Sets up API mocks for a user navigation test.
 *
 * Strategy: whitelist + catch-all 401.
 * - Whitelisted routes (base + extra) return 200 + mock data.
 * - Any non-whitelisted call returns 401 → triggers api.logout() → /login?loggedout=true.
 *   If assertNotLoggedOut fails, an unauthorized endpoint was called.
 *
 * @param page - Playwright page
 * @param extraRoutes - Page-specific routes
 */
export const setupUserMocks = async (page: Page, extraRoutes: Route[] = []) => {
  await page.addInitScript(
    ({ publisherId, token }: { publisherId: string; token: string }) => {
      localStorage.setItem("token", token);
      localStorage.setItem("publisher", publisherId);
    },
    { publisherId: PUBLISHER_ID, token: "mock-token-initial" },
  );

  const allRoutes = [...BASE_ROUTES, ...extraRoutes];

  await page.route(`${API_URL}/**`, async (route) => {
    const reqUrl = route.request().url();
    const method = route.request().method();

    const matched = allRoutes.find((r) => {
      if (r.method !== method) return false;
      return reqUrl === `${API_URL}${r.path}` || reqUrl.startsWith(`${API_URL}${r.path}?`) || reqUrl.includes(r.path);
    });

    if (matched) {
      return route.fulfill({
        status: matched.status ?? 200,
        contentType: "application/json",
        body: JSON.stringify(matched.response),
      });
    }

    // Catch-all → 401: triggers api.logout() in the frontend
    console.warn(`[E2E mock] 401 non-whitelisted: ${method} ${reqUrl}`);
    return route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, error: "Unauthorized" }),
    });
  });
};

/**
 * Asserts the user has not been logged out.
 * A redirect to /login indicates an unauthorized API call triggered api.logout().
 */
export const assertNotLoggedOut = async (page: Page) => {
  await page.waitForLoadState("networkidle");
  await expect(page).not.toHaveURL(/\/login/);
  const token = await page.evaluate(() => localStorage.getItem("token"));
  expect(token).toBeTruthy();
};
