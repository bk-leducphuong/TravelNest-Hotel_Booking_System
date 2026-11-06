import { test, expect } from "@playwright/test";
import { stubConsole } from "./support/console";

const pixel = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=",
  "base64"
);

test.beforeEach(async ({ page }) => {
  await stubConsole(page);
  await page.route("**/images/room/room-1", (route) =>
    route.fulfill({
      json: {
        data: {
          images: [
            {
              id: "photo-1",
              url: "room/room-1/suite.png",
              is_primary: true,
              original_filename: "Suite photo",
            },
            {
              id: "photo-2",
              url: "room/room-1/broken.avif",
              is_primary: false,
              original_filename: "Broken photo",
            },
          ],
        },
      },
    })
  );
  await page.route("https://media.travelnest.test/**", (route) =>
    route.request().url().endsWith("suite.png")
      ? route.fulfill({ contentType: "image/png", body: pixel })
      : route.fulfill({
          contentType: "text/html",
          body: "<!doctype html><p>SPA fallback</p>",
        })
  );
});

test("object keys load from public media and failed decodes show a placeholder", async ({
  page,
}) => {
  await page.goto("/rooms/room-1");
  const image = page.getByRole("img", { name: "Suite photo", exact: true });
  await expect(image).toHaveAttribute(
    "src",
    "https://media.travelnest.test/uploads/room/room-1/suite.png"
  );
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  await expect(
    page.getByRole("img", { name: /Broken photo · Photos could not be loaded/ })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "← Rooms", exact: true })
  ).toBeVisible();
  await expect(page.locator("main")).not.toContainText("← ←");
});

test("mobile rooms do not fetch an invisible preview; desktop selection uses public media", async ({
  page,
}) => {
  let reads = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/images/room/room-1")) reads++;
  });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/rooms");
  await expect(
    page.getByRole("heading", { name: "Deluxe Suite" })
  ).toBeVisible();
  expect(reads).toBe(0);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(
    page.getByRole("img", { name: "Deluxe Suite", exact: true })
  ).toHaveAttribute("src", /media\.travelnest\.test\/uploads\/room\//);
  expect(reads).toBe(1);
  // The broken thumbnail still announces the failure, but compact placeholders
  // keep the visible label out of the small tile.
  const failedThumb = page.getByRole("img", {
    name: /Photos could not be loaded/,
  });
  await expect(failedThumb).toBeVisible();
  await expect(failedThumb).toHaveText("");
});

test("Vietnamese navigation, empty bed selection, amenity categories and labels are localized", async ({
  page,
}) => {
  await page
    .context()
    .addCookies([
      { name: "tn_admin_locale", value: "vi", url: "http://localhost:8015" },
    ]);
  await page.route("**/admin/amenities?*", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: "a1",
            code: "FREE_WIFI",
            name: "Free WiFi",
            category: "technology",
          },
          {
            id: "a2",
            code: "CUSTOM",
            name: "Custom amenity",
            category: "custom_category",
          },
        ],
        meta: { total: 2 },
      },
    })
  );
  await page.goto("/rooms/room-1");
  await expect(
    page.getByRole("link", { name: "Lịch đặt phòng", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Danh sách đặt phòng", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Công nghệ", exact: true })
  ).toBeVisible();
  await expect(page.getByText("WiFi miễn phí", { exact: true })).toBeVisible();
  await expect(page.getByText("Custom amenity", { exact: true })).toBeVisible();
  await page.goto("/rooms/new");
  await expect(
    page
      .locator(".el-select")
      .filter({ has: page.getByRole("combobox", { name: "Loại giường" }) })
  ).toContainText("Chọn");
  await expect(
    page.getByRole("link", { name: "← Phòng", exact: true })
  ).toBeVisible();
});

test("inactive rooms have no redundant deactivate action", async ({ page }) => {
  await page.route("**/admin/hotels/hotel-1/rooms", (route) =>
    route.fulfill({
      json: {
        data: {
          rooms: [
            { id: "inactive", room_name: "Inactive Suite", status: "inactive" },
            { id: "active", room_name: "Active Suite", status: "active" },
          ],
        },
      },
    })
  );
  await page.goto("/rooms");
  await expect(
    page.getByRole("button", { name: "Deactivate Active Suite", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Deactivate Inactive Suite", exact: true })
  ).toHaveCount(0);
});

test("created room survives a partial upload failure and retry never creates another room", async ({
  page,
}) => {
  let creates = 0;
  const files: string[] = [];
  let failed = false;
  await page.route("**/admin/hotels/hotel-1/rooms", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    creates++;
    await route.fulfill({
      json: {
        data: {
          room: { id: "room-1", room_name: "New Suite", status: "active" },
        },
      },
    });
  });
  await page.route("**/images/room/room-1", async (route) => {
    if (route.request().method() !== "POST")
      return route.fulfill({ json: { data: { images: [] } } });
    const body = route.request().postDataBuffer()!.toString();
    const filename = body.match(/filename="([^"]+)"/)![1]!;
    files.push(filename);
    if (filename === "two.png" && !failed) {
      failed = true;
      return route.fulfill({
        status: 503,
        json: { error: { message: "Upload temporarily unavailable" } },
      });
    }
    await route.fulfill({
      json: {
        data: {
          id: filename,
          url: "room/room-1/suite.png",
          original_filename: filename,
        },
      },
    });
  });
  await page.goto("/rooms/new");
  await page
    .getByRole("textbox", { name: "Room name", exact: true })
    .fill("New Suite");
  await page.getByRole("button", { name: "Add room", exact: true }).click();
  await expect(page).toHaveURL(/\/rooms\/room-1$/);
  await page.locator('input[type="file"]').setInputFiles([
    { name: "one.png", mimeType: "image/png", buffer: pixel },
    { name: "two.png", mimeType: "image/png", buffer: pixel },
  ]);
  await expect(
    page.getByText("Upload temporarily unavailable", { exact: true })
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Retry unfinished uploads", exact: true })
    .click();
  await expect(
    page.getByText("Photos uploaded", { exact: true })
  ).toBeVisible();
  expect(files).toEqual(["one.png", "two.png", "two.png"]);
  expect(creates).toBe(1);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Upload photos", exact: true })
  ).toBeVisible();
  expect(creates).toBe(1);
});
