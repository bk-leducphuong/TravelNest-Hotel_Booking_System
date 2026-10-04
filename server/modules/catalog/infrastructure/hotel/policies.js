const { HotelPolicies } = require('@platform/database');

/**
 * Hotel policy (hotel_policies) reads/writes for the back-office property editor.
 */

async function findPoliciesForAdmin(hotelId) {
  return await HotelPolicies.findAll({
    where: { hotel_id: hotelId },
    order: [
      ['display_order', 'ASC'],
      ['created_at', 'ASC'],
    ],
  });
}

async function findPolicyByIdAndHotelId(policyId, hotelId) {
  return await HotelPolicies.findOne({ where: { id: policyId, hotel_id: hotelId } });
}

async function createPolicy(data) {
  return await HotelPolicies.create({
    hotel_id: data.hotelId,
    policy_type: data.policyType,
    title: data.title,
    description: data.description,
    display_order: data.displayOrder ?? 0,
    icon: data.icon ?? null,
    is_active: data.isActive ?? true,
    created_at: new Date(),
    updated_at: new Date(),
  });
}

async function updatePolicy(policyId, values) {
  return await HotelPolicies.update(
    { ...values, updated_at: new Date() },
    { where: { id: policyId } }
  );
}

/** Soft delete: policies are kept for history, just hidden. */
async function deactivatePolicy(policyId) {
  return await HotelPolicies.update(
    { is_active: false, updated_at: new Date() },
    { where: { id: policyId } }
  );
}

module.exports = {
  findPoliciesForAdmin,
  findPolicyByIdAndHotelId,
  createPolicy,
  updatePolicy,
  deactivatePolicy,
};
