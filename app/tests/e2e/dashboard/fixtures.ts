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
  isAnnonceur: true, // flux = "to" — active Performance (GlobalAnnounce) + Settings Flux
  publishers: [],
};

const MOCK_TOKEN = "mock-token-refreshed";

const API_URL = "http://localhost:4000";

type Route = { method: string; path: string; response: object; status?: number };

/**
 * Routes appelées par les layouts partagés sur toutes les pages protégées :
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
 * Configure les mocks API pour un test de navigation user.
 *
 * Stratégie : whitelist + catch-all 401.
 * - Les routes whitelistées (base + extra) retournent 200 + données mock.
 * - Tout appel non whitelisté retourne 401 → déclenche api.logout() → /login?loggedout=true.
 *   Si assertNotLoggedOut échoue, c'est qu'un endpoint non autorisé a été appelé.
 *
 * @param page - Page Playwright
 * @param extraRoutes - Routes spécifiques à la page testée
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

    // Catch-all → 401 : déclenche api.logout() dans le frontend
    console.warn(`[E2E mock] 401 non-whitelisted: ${method} ${reqUrl}`);
    return route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, error: "Unauthorized" }),
    });
  });
};

/**
 * Vérifie que l'utilisateur n'a pas été déconnecté.
 * Un redirect vers /login indique qu'un appel API non autorisé a déclenché api.logout().
 */
export const assertNotLoggedOut = async (page: Page) => {
  await page.waitForLoadState("networkidle");
  await expect(page).not.toHaveURL(/\/login/);
  const token = await page.evaluate(() => localStorage.getItem("token"));
  expect(token).toBeTruthy();
};
