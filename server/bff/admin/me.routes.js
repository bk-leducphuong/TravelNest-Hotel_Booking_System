const express = require('express');

const { authenticate } = require('@middlewares/auth.middleware');
const { collectPermissionNames } = require('@helpers/permission.helper');

const router = express.Router();

/**
 * Build the admin session payload: who the user is, their global roles, their
 * effective permissions and the hotels they can manage. This is what the admin
 * client uses to gate navigation/actions and to populate the hotel switcher.
 */
function buildAdminMe(user, auth) {
  const globalRoles = (user.roles || []).map((userRole) => userRole.role?.name).filter(Boolean);
  const globalPermissions = collectPermissionNames(user.roles || []);

  const hotels = (user.hotel_roles || []).map((hotelUser) => ({
    id: hotelUser.hotel_id,
    name: hotelUser.hotel?.name || null,
    role: hotelUser.role?.name || null,
    isPrimaryOwner: Boolean(hotelUser.is_primary_owner),
    permissions: Array.from(collectPermissionNames([{ role: hotelUser.role }])).sort(),
  }));

  const permissionUnion = new Set(globalPermissions);
  hotels.forEach((hotel) =>
    hotel.permissions.forEach((permission) => permissionUnion.add(permission))
  );

  return {
    user: { id: user.id, email: user.email },
    globalRoles,
    tokenRoles: auth?.roles || [],
    permissions: Array.from(permissionUnion).sort(),
    hotels,
  };
}

router.get('/', authenticate, (req, res) => {
  res.status(200).json({ data: buildAdminMe(req.user, req.auth) });
});

module.exports = router;
module.exports.buildAdminMe = buildAdminMe;
