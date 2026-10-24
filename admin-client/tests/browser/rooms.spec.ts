import { test, expect } from "@playwright/test";

const room = {
  id: "room-1",
  hotel_id: "hotel-1",
  room_name: "Deluxe Suite",
  room_type: "Suite",
  bed_type: "king",
  max_guests: 3,
  quantity: 8,
  room_size: 55,
  status: "active",
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let body: unknown = { data: [] };
    if (path.endsWith("/rooms") && request.method() === "GET")
      body = {
        data: {
          rooms: [
            request.headers()["x-hotel-id"] === "hotel-2"
              ? {
                  ...room,
                  id: "room-2",
                  hotel_id: "hotel-2",
                  room_name: "Garden Room",
                }
              : room,
          ],
        },
      };
    else if (path.endsWith("/rooms") && request.method() === "POST")
      body = { data: { room } };
    else if (path.endsWith("/room-1") && request.method() === "PATCH") {
      const payload = request.postDataJSON();
      body = {
        data: {
          room: {
            ...room,
            room_name: payload.roomName ?? room.room_name,
            quantity: payload.quantity ?? room.quantity,
          },
        },
      };
    } else if (path.includes("/images/")) body = { data: { images: [] } };
    else if (path.endsWith("/amenities") && path.includes("/rooms/"))
      body = { data: { amenityIds: [] } };
    else if (path.endsWith("/amenities"))
      body = { data: [], meta: { total: 0 } };
    await route.fulfill({ json: body });
  });
});

test("permission-aware shell, quick jump and mobile context", async ({
  page,
}, testInfo) => {
  await page.goto("/rooms");
  await expect(
    page.getByRole("heading", { name: "Room categories" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add room", exact: true })
  ).toHaveCSS("background-color", "rgb(0, 113, 194)");
  await page.screenshot({
    path: testInfo.outputPath("rooms-desktop.png"),
    fullPage: true,
  });
  await expect(
    page.getByRole("link", { name: "Availability", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Go to…", exact: true }).click();
  const search = page.getByRole("combobox", { name: "Search pages" });
  await search.fill("add room");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/rooms\/new$/);
  await page.goto("/rooms");
  await page.locator("#desktop-hotel").press("Enter");
  await page.getByRole("option", { name: "TravelNest Garden" }).click();
  await expect(page.locator(".el-select-dropdown:visible")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Garden Room", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Add room", exact: true })
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Add room", exact: true })
  ).toHaveCount(0);
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator("#mobile-hotel")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("rooms-mobile.png"),
    fullPage: true,
  });
  await expect(
    page.locator(".el-select").filter({ has: page.locator("#mobile-hotel") })
  ).toContainText("TravelNest Garden");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true);
});

test("independent saves and unsaved-change protection", async ({ page }) => {
  await page.goto("/rooms/room-1");
  await page
    .getByRole("textbox", { name: "Room name", exact: true })
    .fill("Updated Suite");
  await page
    .getByRole("spinbutton", { name: "Allotment", exact: true })
    .fill("12");
  const update = page.waitForRequest((request) => request.method() === "PATCH");
  await page
    .getByRole("button", { name: "Save basic information", exact: true })
    .click();
  expect((await update).postDataJSON()).toEqual({
    roomName: "Updated Suite",
    roomType: "Suite",
    status: "active",
  });
  await expect(
    page.getByRole("spinbutton", { name: "Allotment", exact: true })
  ).toHaveValue("12");
  await page.getByRole("link", { name: "Availability", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Unsaved changes" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Stay here", exact: true }).click();
  await expect(page).toHaveURL(/\/rooms\/room-1$/);
});

test("room creation opens the existing record for media and amenities", async ({
  page,
}) => {
  let creates = 0;
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname.endsWith("/rooms")
    )
      creates++;
  });
  await page.goto("/rooms/new");
  await page
    .getByRole("textbox", { name: "Room name", exact: true })
    .fill("New Suite");
  await page.getByRole("button", { name: "Add room", exact: true }).click();
  await expect(page).toHaveURL(/\/rooms\/room-1$/);
  await expect(
    page.getByRole("button", { name: "Upload photos", exact: true })
  ).toBeVisible();
  expect(creates).toBe(1);
});

test("room list ignores stale responses after switching hotels", async ({
  page,
}) => {
  let release!: () => void;
  let oldRequested!: () => void;
  const requested = new Promise<void>((resolve) => {
    oldRequested = resolve;
  });
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/admin/hotels/hotel-1/rooms", async (route) => {
    oldRequested();
    await delayed;
    await route.fulfill({ json: { data: { rooms: [room] } } });
  });
  await page.goto("/rooms");
  await requested;
  await page.locator("#desktop-hotel").press("Enter");
  await page.getByRole("option", { name: "TravelNest Garden" }).click();
  await expect(page.locator(".el-select-dropdown:visible")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Garden Room", exact: true })
  ).toBeVisible();
  const stale = page.waitForResponse((response) =>
    response.url().endsWith("/admin/hotels/hotel-1/rooms")
  );
  release();
  await (await stale).finished();
  await expect(
    page.getByRole("button", { name: "Deluxe Suite", exact: true })
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Garden Room", exact: true })
  ).toBeVisible();
});

test("room layouts remain usable across target widths and Vietnamese", async ({
  page,
}, testInfo) => {
  await page.goto("/rooms");
  await expect(
    page.getByRole("heading", { name: "Room categories" })
  ).toBeVisible();
  for (const width of [375, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    ).toBe(true);
    const menu = page.getByRole("button", { name: "Menu", exact: true });
    if (width < 768) {
      await expect(menu).toBeVisible();
      await menu.click();
      await expect(
        page.getByRole("dialog", { name: "Main navigation" })
      ).toBeVisible();
      await page.keyboard.press("Escape");
    } else await expect(menu).toHaveCount(0);
  }
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Tiếng Việt" }).click();
  await expect(
    page.getByRole("heading", { name: "Danh sách loại phòng" })
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("rooms-vietnamese.png"),
    fullPage: true,
  });
});

test("pending room saves block navigation and hotel switching", async ({
  page,
}) => {
  let release!: () => void;
  let requested!: () => void;
  const started = new Promise<void>((resolve) => {
    requested = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/admin/hotels/hotel-1/rooms/room-1", async (route) => {
    if (route.request().method() !== "PATCH") return route.fallback();
    requested();
    await gate;
    await route.fulfill({
      json: { data: { room: { ...room, room_name: "Saved Suite" } } },
    });
  });
  await page.goto("/rooms/room-1");
  await page
    .getByRole("textbox", { name: "Room name", exact: true })
    .fill("Saved Suite");
  await page
    .getByRole("button", { name: "Save basic information", exact: true })
    .click();
  await started;
  await page.getByRole("link", { name: "Availability", exact: true }).click();
  await expect(page).toHaveURL(/\/rooms\/room-1$/);
  await page.locator("#desktop-hotel").press("Enter");
  await page.getByRole("option", { name: "TravelNest Garden" }).click();
  await expect(
    page.locator(".el-select").filter({ has: page.locator("#desktop-hotel") })
  ).toContainText("TravelNest Riverside");
  const response = page.waitForResponse(
    (result) => result.request().method() === "PATCH"
  );
  release();
  await (await response).finished();
  await expect(
    page.getByRole("heading", { name: "Saved Suite", exact: true })
  ).toBeVisible();
});
