const { Users, Roles, UserRoles, HotelUsers, AuthAccounts } = require('@models/index.js');
const { Op } = require('sequelize');

/**
 * Auth Repository - Contains all database operations for authentication
 * Only repositories may import Sequelize models
 */

class AuthRepository {
  /**
   * Find user by email with role check
   * @param {string} email - User email
   * @param {string} roleName - Role name (e.g., 'guest', 'hotel_manager')
   * @returns {Promise<Object|null>} User with role information
   */
  async findByEmailAndRole(email, roleName) {
    const role = await Roles.findOne({ where: { name: roleName } });
    if (!role) {
      return null;
    }

    return await Users.findOne({
      where: { email },
      include: [
        {
          model: UserRoles,
          as: 'roles',
          where: { role_id: role.id },
          required: true,
          include: [
            {
              model: Roles,
              as: 'role',
              attributes: ['id', 'name', 'description'],
            },
          ],
        },
      ],
    });
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User object
   */
  async findByEmail(email) {
    return await Users.findOne({
      where: { email },
      include: [
        {
          model: UserRoles,
          as: 'roles',
          include: [
            {
              model: Roles,
              as: 'role',
              attributes: ['id', 'name', 'description'],
            },
          ],
        },
      ],
    });
  }

  /**
   * Find user by email or phone number with role check
   * @param {string} email - User email
   * @param {string} phoneNumber - User phone number
   * @param {string} roleName - Role name
   * @returns {Promise<Object|null>} User with role information
   */
  async findByEmailOrPhoneAndRole(email, phoneNumber, roleName) {
    const role = await Roles.findOne({ where: { name: roleName } });
    if (!role) {
      return null;
    }

    return await Users.findOne({
      where: {
        [Op.or]: [{ email }, { phone_number: phoneNumber }],
      },
      include: [
        {
          model: UserRoles,
          as: 'roles',
          where: { role_id: role.id },
          required: true,
          include: [
            {
              model: Roles,
              as: 'role',
              attributes: ['id', 'name', 'description'],
            },
          ],
        },
      ],
    });
  }

  /**
   * Create new user
   * @param {Object} userData - User data to create
   * @returns {Promise<Object>} Created user
   */
  async createUser(userData) {
    return await Users.create(userData);
  }

  /**
   * Create local auth account for a user
   * @param {string} userId
   * @param {string} email
   * @param {string} passwordHash
   * @returns {Promise<Object>}
   */
  async createLocalAuthAccount(userId, email, passwordHash) {
    return await AuthAccounts.create({
      user_id: userId,
      provider: 'local',
      provider_user_id: email,
      password_hash: passwordHash,
    });
  }

  /**
   * Assign role to user
   * @param {string} userId - User ID
   * @param {string} roleId - Role ID
   * @returns {Promise<Object>} Created user role assignment
   */
  async assignRoleToUser(userId, roleId) {
    return await UserRoles.create({
      user_id: userId,
      role_id: roleId,
    });
  }

  /**
   * Find role by name
   * @param {string} roleName - Role name
   * @returns {Promise<Object|null>} Role object
   */
  async findRoleByName(roleName) {
    return await Roles.findOne({ where: { name: roleName } });
  }

  /**
   * Update user password by email
   * @param {string} email - User email
   * @param {string} passwordHash - Hashed password
   * @returns {Promise<number>} Number of updated rows
   */
  async updatePasswordByEmail(email, passwordHash) {
    const [updatedRows] = await AuthAccounts.update(
      { password_hash: passwordHash },
      {
        where: {
          provider: 'local',
          provider_user_id: email,
        },
      }
    );
    return updatedRows;
  }

  /**
   * Find user by email and role with password hash (for login)
   * @param {string} email - User email
   * @param {string} roleName - Role name
   * @returns {Promise<Object|null>} User with password hash and role
   */
  async findByEmailAndRoleWithPassword(email, roleName) {
    const role = await Roles.findOne({ where: { name: roleName } });
    if (!role) {
      return null;
    }

    const user = await Users.findOne({
      where: { email },
      attributes: ['id', 'email', 'status'],
      include: [
        {
          model: AuthAccounts,
          as: 'auth_accounts',
          required: true,
          where: {
            provider: 'local',
            provider_user_id: email,
          },
          attributes: ['password_hash'],
        },
        {
          model: UserRoles,
          as: 'roles',
          where: { role_id: role.id },
          required: true,
          include: [
            {
              model: Roles,
              as: 'role',
              attributes: ['id', 'name'],
            },
          ],
        },
      ],
    });

    if (user && user.roles && user.roles.length > 0) {
      return {
        id: user.id,
        email: user.email,
        password_hash: user.auth_accounts[0]?.password_hash || null,
        status: user.status,
        role: user.roles[0].role.name,
      };
    }

    return null;
  }

  /**
   * Update user last login timestamp
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async updateLastLogin(userId) {
    await Users.update({ last_login_at: new Date() }, { where: { id: userId } });
  }

  /**
   * Get user with roles and hotel context
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} User with roles and hotel_users
   */
  async getUserWithContext(userId) {
    return await Users.findByPk(userId, {
      include: [
        {
          model: UserRoles,
          as: 'roles',
          include: [
            {
              model: Roles,
              as: 'role',
              attributes: ['id', 'name', 'description'],
            },
          ],
        },
        {
          model: HotelUsers,
          as: 'hotel_roles',
          attributes: ['hotel_id', 'role_id', 'is_primary_owner'],
          include: [
            {
              model: Roles,
              as: 'role',
              attributes: ['id', 'name', 'description'],
            },
          ],
        },
      ],
    });
  }
}

module.exports = new AuthRepository();
