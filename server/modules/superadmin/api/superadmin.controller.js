const asyncHandler = require('@utils/asyncHandler');
const { collectPermissionNames } = require('@helpers/permission.helper');
const { PERMISSIONS } = require('@constants/permissions');
const { auditService } = require('@platform/audit');

const { getOverview } = require('../application/overview.service');
const { listHotels, getHotel } = require('../application/hotel-admin.service');
const { listUsers, getUser } = require('../application/user-admin.service');
const finance = require('../application/finance-admin.service');

/**
 * Session bootstrap for the superadmin console: who the caller is, their global
 * roles and their global permissions. Mirrors the admin BFF's `/admin/me` shape
 * but without the hotel list (the platform console is not hotel-scoped).
 */
const getMeHandler = asyncHandler(async (req, res) => {
  const globalRoles = (req.user?.roles || [])
    .map((userRole) => userRole.role?.name)
    .filter(Boolean);
  const permissions = Array.from(collectPermissionNames(req.user?.roles || [])).sort();

  res.status(200).json({
    data: {
      user: { id: req.user?.id, email: req.user?.email },
      globalRoles,
      tokenRoles: req.auth?.roles || [],
      permissions,
    },
  });
});

const getOverviewHandler = asyncHandler(async (req, res) => {
  const data = await getOverview();
  res.status(200).json({ data });
});

/** Whether the caller may see unmasked PII. */
function canUnmaskPii(req) {
  const permissions = collectPermissionNames(req.user?.roles || []);
  return permissions.has(PERMISSIONS.PLATFORM_USER_PII_READ);
}

const listHotelsHandler = asyncHandler(async (req, res) => {
  const { hotels, page, limit, total } = await listHotels(req.query, {
    unmaskPii: canUnmaskPii(req),
  });
  res.status(200).json({ data: hotels, meta: { page, limit, total } });
});

const getHotelHandler = asyncHandler(async (req, res) => {
  const data = await getHotel(req.params.hotelId, { unmaskPii: canUnmaskPii(req) });
  res.status(200).json({ data });
});

const listUsersHandler = asyncHandler(async (req, res) => {
  const { users, page, limit, total } = await listUsers(req.query, {
    unmaskPii: canUnmaskPii(req),
  });
  res.status(200).json({ data: users, meta: { page, limit, total } });
});

const getUserHandler = asyncHandler(async (req, res) => {
  const data = await getUser(req.params.userId, { unmaskPii: canUnmaskPii(req) });
  res.status(200).json({ data });
});

const listAuditHandler = asyncHandler(async (req, res) => {
  const data = await auditService.list(req.query);
  res.status(200).json({
    data: data.entries,
    meta: { page: data.page, limit: data.limit, total: data.total },
  });
});

const getFinanceOverviewHandler = asyncHandler(async (req, res) => {
  const data = await finance.getFinanceOverview();
  res.status(200).json({ data });
});

const listPaymentsHandler = asyncHandler(async (req, res) => {
  const { payments, page, limit, total } = await finance.listPayments(req.query, {
    unmaskPii: canUnmaskPii(req),
  });
  res.status(200).json({ data: payments, meta: { page, limit, total } });
});

const listRefundsHandler = asyncHandler(async (req, res) => {
  const { refunds, page, limit, total } = await finance.listRefunds(req.query, {
    unmaskPii: canUnmaskPii(req),
  });
  res.status(200).json({ data: refunds, meta: { page, limit, total } });
});

const listPayoutsHandler = asyncHandler(async (req, res) => {
  const { payouts, page, limit, total } = await finance.listPayouts(req.query, {
    unmaskPii: canUnmaskPii(req),
  });
  res.status(200).json({ data: payouts, meta: { page, limit, total } });
});

const listLedgerHandler = asyncHandler(async (req, res) => {
  const { entries, page, limit, total } = await finance.listLedgerEntries(req.query);
  res.status(200).json({ data: entries, meta: { page, limit, total } });
});

module.exports = {
  getMeHandler,
  getOverviewHandler,
  listHotelsHandler,
  getHotelHandler,
  listUsersHandler,
  getUserHandler,
  listAuditHandler,
  getFinanceOverviewHandler,
  listPaymentsHandler,
  listRefundsHandler,
  listPayoutsHandler,
  listLedgerHandler,
};
