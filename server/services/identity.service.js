const authRepository = require('@repositories/auth.repository');
const ApiError = require('@utils/ApiError');
const { ROLES } = require('@constants/roles');

const MANAGED_GLOBAL_ROLES = [ROLES.USER, ROLES.ADMIN, ROLES.SUPPORT_AGENT];

function deriveNames(claims) {
  const givenName = claims.payload.given_name?.trim();
  const familyName = claims.payload.family_name?.trim();

  if (givenName && familyName) {
    return {
      firstName: givenName,
      lastName: familyName,
    };
  }

  const fullName = claims.payload.name?.trim();
  if (fullName) {
    const [firstName, ...rest] = fullName.split(/\s+/);
    return {
      firstName: firstName || 'TravelNest',
      lastName: rest.join(' ') || firstName || 'User',
    };
  }

  const localPart = claims.email?.split('@')[0] || 'travelnest-user';
  return {
    firstName: localPart,
    lastName: 'User',
  };
}

function getManagedRoleNamesFromClaims(roleNames) {
  const normalizedRoleNames = new Set(Array.isArray(roleNames) ? roleNames : []);
  const managedRoleNames = MANAGED_GLOBAL_ROLES.filter((roleName) =>
    normalizedRoleNames.has(roleName)
  );

  if (managedRoleNames.length === 0) {
    managedRoleNames.push(ROLES.USER);
  }

  return managedRoleNames;
}

class IdentityService {
  async resolveAuthenticatedUser(claims) {
    if (!claims?.subject) {
      throw new ApiError(401, 'INVALID_TOKEN', 'Bearer token is missing the subject claim');
    }

    const email = claims.email;
    if (!email) {
      throw new ApiError(401, 'INVALID_TOKEN', 'Bearer token is missing the email claim');
    }

    let user = await authRepository.findByKeycloakUserId(claims.subject);

    if (!user) {
      user = await authRepository.findByEmail(email);

      if (user) {
        if (user.keycloak_user_id && user.keycloak_user_id !== claims.subject) {
          throw new ApiError(
            409,
            'KEYCLOAK_SUBJECT_MISMATCH',
            'The local account is already linked to a different Keycloak user'
          );
        }

        await authRepository.bindKeycloakUserId(user.id, claims.subject);
      } else {
        const { firstName, lastName } = deriveNames(claims);
        user = await authRepository.createUser({
          keycloak_user_id: claims.subject,
          email,
          first_name: firstName,
          last_name: lastName,
          status: 'active',
          email_verified_at: claims.payload.email_verified ? new Date() : null,
        });
      }
    }

    await this.syncManagedRoles(user.id, claims.roles);
    await authRepository.updateLastLogin(user.id);

    const userWithContext = await authRepository.getUserWithContext(user.id);
    if (!userWithContext) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    }

    if (userWithContext.status !== 'active') {
      throw new ApiError(
        403,
        'ACCOUNT_INACTIVE',
        `Account is ${userWithContext.status}. Please contact support.`
      );
    }

    return userWithContext;
  }

  async syncManagedRoles(userId, tokenRoleNames) {
    const desiredRoleNames = getManagedRoleNamesFromClaims(tokenRoleNames);
    const managedRoles = await authRepository.findRolesByNames(MANAGED_GLOBAL_ROLES);
    const desiredRoles = managedRoles.filter((role) => desiredRoleNames.includes(role.name));

    await authRepository.replaceManagedUserRoles(
      userId,
      desiredRoles.map((role) => role.id),
      managedRoles.map((role) => role.id)
    );
  }
}

module.exports = new IdentityService();
