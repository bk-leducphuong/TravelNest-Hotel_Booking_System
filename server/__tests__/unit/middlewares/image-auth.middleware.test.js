jest.mock('@models/index.js', () => ({
  images: { findOne: jest.fn() },
  rooms: { findOne: jest.fn() },
  reviews: { findOne: jest.fn() },
}));

const { images, rooms, reviews } = require('@models/index.js');
const {
  authorizeImageEntityWrite,
  authorizeImageDelete,
} = require('@middlewares/image-auth.middleware');

const HOTEL_ID = '11111111-1111-7111-8111-111111111111';
const OTHER_HOTEL_ID = '22222222-2222-7222-8222-222222222222';
const ROOM_ID = '33333333-3333-7333-8333-333333333333';
const REVIEW_ID = '44444444-4444-7444-8444-444444444444';

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function ownerOf(hotelId) {
  return {
    id: 'user-1',
    roles: [{ role: { name: 'owner' } }],
    hotel_roles: [{ hotel_id: hotelId }],
  };
}

function makeReq({ user, params, tokenRoles = [] }) {
  return { user, params, auth: { roles: tokenRoles } };
}

describe('image-auth.middleware', () => {
  describe('authorizeImageEntityWrite', () => {
    it('allows platform admins for any entity', async () => {
      const res = makeRes();
      const next = jest.fn();

      await authorizeImageEntityWrite(
        makeReq({
          user: { id: 'admin-1', roles: [], hotel_roles: [] },
          params: { entityType: 'hotel', entityId: HOTEL_ID },
          tokenRoles: ['admin'],
        }),
        res,
        next
      );

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('allows a hotel owner for their own hotel', async () => {
      const res = makeRes();
      const next = jest.fn();

      await authorizeImageEntityWrite(
        makeReq({
          user: ownerOf(HOTEL_ID),
          params: { entityType: 'hotel', entityId: HOTEL_ID },
        }),
        res,
        next
      );

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('rejects a user with no role on the hotel', async () => {
      const res = makeRes();
      const next = jest.fn();

      await authorizeImageEntityWrite(
        makeReq({
          user: ownerOf(HOTEL_ID),
          params: { entityType: 'hotel', entityId: OTHER_HOTEL_ID },
        }),
        res,
        next
      );

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('resolves room and review entities to their hotel', async () => {
      rooms.findOne.mockResolvedValue({ hotel_id: HOTEL_ID });
      reviews.findOne.mockResolvedValue({ hotel_id: HOTEL_ID });

      for (const [entityType, entityId] of [
        ['room', ROOM_ID],
        ['review', REVIEW_ID],
      ]) {
        const res = makeRes();
        const next = jest.fn();
        await authorizeImageEntityWrite(
          makeReq({ user: ownerOf(HOTEL_ID), params: { entityType, entityId } }),
          res,
          next
        );
        expect(next).toHaveBeenCalledTimes(1);
      }
    });

    it('only allows users to manage their own avatar', async () => {
      const allowedRes = makeRes();
      const allowedNext = jest.fn();
      await authorizeImageEntityWrite(
        makeReq({
          user: { id: 'user-1', roles: [], hotel_roles: [] },
          params: { entityType: 'user_avatar', entityId: 'user-1' },
        }),
        allowedRes,
        allowedNext
      );
      expect(allowedNext).toHaveBeenCalledTimes(1);

      const deniedRes = makeRes();
      await authorizeImageEntityWrite(
        makeReq({
          user: { id: 'user-1', roles: [], hotel_roles: [] },
          params: { entityType: 'user_avatar', entityId: 'user-2' },
        }),
        deniedRes,
        jest.fn()
      );
      expect(deniedRes.status).toHaveBeenCalledWith(403);
    });

    it('rejects catalog (city) imagery for non-admins', async () => {
      const res = makeRes();
      await authorizeImageEntityWrite(
        makeReq({
          user: ownerOf(HOTEL_ID),
          params: { entityType: 'city', entityId: HOTEL_ID },
        }),
        res,
        jest.fn()
      );
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('rejects malformed entity ids', async () => {
      const res = makeRes();
      await authorizeImageEntityWrite(
        makeReq({
          user: ownerOf(HOTEL_ID),
          params: { entityType: 'room', entityId: 'not-a-uuid' },
        }),
        res,
        jest.fn()
      );
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('authorizeImageDelete', () => {
    it('allows deleting an image on the owner\u2019s hotel', async () => {
      images.findOne.mockResolvedValue({ id: 'img-1', entity_type: 'room', entity_id: ROOM_ID });
      rooms.findOne.mockResolvedValue({ hotel_id: HOTEL_ID });

      const res = makeRes();
      const next = jest.fn();

      await authorizeImageDelete(
        makeReq({ user: ownerOf(HOTEL_ID), params: { id: 'img-1' } }),
        res,
        next
      );

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('rejects deleting an image on another hotel', async () => {
      images.findOne.mockResolvedValue({
        id: 'img-1',
        entity_type: 'room',
        entity_id: ROOM_ID,
      });
      rooms.findOne.mockResolvedValue({ hotel_id: OTHER_HOTEL_ID });

      const res = makeRes();
      await authorizeImageDelete(
        makeReq({ user: ownerOf(HOTEL_ID), params: { id: 'img-1' } }),
        res,
        jest.fn()
      );

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('falls through for unknown images (controller returns 404)', async () => {
      images.findOne.mockResolvedValue(null);
      const res = makeRes();
      const next = jest.fn();

      await authorizeImageDelete(
        makeReq({ user: ownerOf(HOTEL_ID), params: { id: 'missing' } }),
        res,
        next
      );

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
