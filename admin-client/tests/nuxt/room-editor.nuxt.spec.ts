import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";

const { auth, update, upload, create, fetchRooms } = vi.hoisted(() => {
  const room = {
    id: "room-1",
    hotel_id: "hotel-1",
    room_name: "Maple",
    room_type: "Deluxe",
    bed_type: "king",
    max_guests: 2,
    quantity: 5,
    room_size: 30,
    status: "active",
  };
  return {
    auth: {
      activeHotelId: "hotel-1",
      activeHotel: {
        name: "Test Hotel",
        permissions: ["room.read", "room.create", "room.update"],
      },
      globalRoles: [],
      permissions: [],
      isAuthenticated: true,
      sessionLoaded: true,
      ensureInitialized: vi.fn().mockResolvedValue(undefined),
    },
    update: vi.fn().mockResolvedValue({ ...room, room_name: "Birch" }),
    upload: vi.fn(),
    create: vi.fn(),
    fetchRooms: vi.fn().mockResolvedValue([room]),
  };
});
vi.mock("~/stores/auth", () => ({ useAuthStore: () => auth }));
mockNuxtImport("useAuthStore", () => () => auth);
vi.mock("~/services/api/catalog", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("~/services/api/catalog")>();
  return {
    ...original,
    fetchRooms,
    updateRoom: update,
    createRoom: create,
    uploadRoomPhoto: upload,
    fetchRoomPhotos: vi.fn().mockResolvedValue([]),
    fetchAmenities: vi.fn().mockResolvedValue({ data: [] }),
    fetchRoomAmenities: vi.fn().mockResolvedValue([]),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("room editing", () => {
  it("saves basic fields without submitting or overwriting an unsaved configuration", async () => {
    const Page = (await import("~/pages/rooms/[roomId].vue")).default;
    const wrapper = await mountSuspended(Page, { route: "/rooms/room-1" });
    await flushPromises();
    await wrapper.get('input[aria-label="Room name"]').setValue("Birch");
    await wrapper.get('input[aria-label="Allotment"]').setValue("11");
    const save = wrapper
      .findAll("button")
      .find((button) => button.text() === "Save basic information")!;
    await save.trigger("click");
    await flushPromises();
    expect(update).toHaveBeenCalledWith("hotel-1", "room-1", {
      roomName: "Birch",
      roomType: "Deluxe",
      status: "active",
    });
    expect(
      (wrapper.get('input[aria-label="Allotment"]').element as HTMLInputElement)
        .value
    ).toBe("11");
    wrapper.unmount();
  }, 20000);

  it("retries unfinished photos on the same room, without repeating successful uploads", async () => {
    upload
      .mockResolvedValueOnce({ id: "photo-1" })
      .mockRejectedValueOnce(new Error("Offline"))
      .mockResolvedValueOnce({ id: "photo-2" });
    const Media = (await import("~/components/rooms/RoomMedia.vue")).default;
    const wrapper = await mountSuspended(Media, {
      props: { roomId: "room-1", editable: true },
    });
    await flushPromises();
    const input = wrapper.get('input[type="file"]');
    Object.defineProperty(input.element, "files", {
      configurable: true,
      value: [
        new File(["a"], "one.jpg", { type: "image/jpeg" }),
        new File(["b"], "two.jpg", { type: "image/jpeg" }),
      ],
    });
    await input.trigger("change");
    await flushPromises();
    expect(wrapper.text()).toContain("Offline");
    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Retry unfinished uploads")!
      .trigger("click");
    await flushPromises();
    expect(upload).toHaveBeenCalledTimes(3);
    expect(
      upload.mock.calls.map((call) => [call[0], call[1].name, call[2]])
    ).toEqual([
      ["room-1", "one.jpg", true],
      ["room-1", "two.jpg", false],
      ["room-1", "two.jpg", false],
    ]);
    expect(create).not.toHaveBeenCalled();
    wrapper.unmount();
  }, 20000);
});
