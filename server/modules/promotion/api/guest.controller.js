/**
 * Promotion guest controller.
 *
 * The preview use-case lives in the booking module because it owns holds. It is
 * required lazily so promotion and booking can depend on each other without a
 * load-time cycle.
 */
const previewPromotionHandler = async (req, res) => {
  const bookingModule = require('@modules/booking');
  const data = await bookingModule.previewPromotion(req.user?.id, req.body);
  res.status(200).json({ data });
};

module.exports = { previewPromotionHandler };
