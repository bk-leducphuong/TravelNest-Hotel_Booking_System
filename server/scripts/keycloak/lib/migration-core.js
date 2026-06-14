const { MANAGED_ROLE_NAMES } = require('./source-users');

function normalizeKeycloakEmail(email) {
  return email?.trim().toLowerCase() || null;
}

function buildUserAttributes(sourceUser, batchId) {
  return {
    legacy_user_id: [sourceUser.id],
    legacy_status: [sourceUser.status],
    legacy_auth_providers: sourceUser.auth_provider_names,
    migration_batch: [batchId],
  };
}

function buildImportedPasswordCredential(passwordHash) {
  return {
    type: 'password',
    credentialData: JSON.stringify({
      algorithm: 'bcrypt',
      hashIterations: 10,
    }),
    secretData: JSON.stringify({
      value: passwordHash,
    }),
  };
}

function buildKeycloakCreatePayload(sourceUser, batchId, includePasswordCredential) {
  const payload = {
    username: sourceUser.normalized_email,
    email: sourceUser.normalized_email,
    firstName: sourceUser.first_name,
    lastName: sourceUser.last_name,
    enabled: sourceUser.status === 'active',
    emailVerified: Boolean(sourceUser.email_verified_at),
    attributes: buildUserAttributes(sourceUser, batchId),
  };

  const localAccount = sourceUser.local_auth_accounts[0];
  const needsPasswordReset = !localAccount?.password_hash;

  if (includePasswordCredential && localAccount?.password_hash) {
    payload.credentials = [buildImportedPasswordCredential(localAccount.password_hash)];
  } else if (needsPasswordReset) {
    payload.requiredActions = ['UPDATE_PASSWORD'];
  }

  return payload;
}

function getManagedRoleNames(sourceUser) {
  const roles = Array.isArray(sourceUser.managed_role_names) ? sourceUser.managed_role_names : [];
  const filteredRoles = roles.filter((roleName) => MANAGED_ROLE_NAMES.includes(roleName));
  return Array.from(new Set(filteredRoles));
}

function summarizeResults(results) {
  return results.reduce(
    (summary, result) => {
      if (summary[result.status] !== undefined) {
        summary[result.status] += 1;
      }

      if (result.passwordResetRequired) {
        summary.password_reset_required += 1;
      }

      return summary;
    },
    {
      created: 0,
      bound_existing: 0,
      skipped: 0,
      failed: 0,
      password_reset_required: 0,
    }
  );
}

function toAuditFailure(userId, email, code, message, extra = {}) {
  return {
    userId,
    email,
    code,
    message,
    ...extra,
  };
}

async function auditUsers(sourceUsers, adminClient) {
  const failures = [];
  const infos = [];
  const seenKeycloakUserIds = new Map();
  const usersByEmail = new Map();

  for (const sourceUser of sourceUsers) {
    const normalizedEmail = sourceUser.normalized_email;
    const localAuthCount = sourceUser.local_auth_accounts.length;

    if (!normalizedEmail) {
      failures.push(
        toAuditFailure(sourceUser.id, sourceUser.email, 'MISSING_EMAIL', 'User is missing an email')
      );
      continue;
    }

    if (!usersByEmail.has(normalizedEmail)) {
      usersByEmail.set(normalizedEmail, []);
    }
    usersByEmail.get(normalizedEmail).push(sourceUser.id);

    if (sourceUser.keycloak_user_id) {
      const existingOwner = seenKeycloakUserIds.get(sourceUser.keycloak_user_id);
      if (existingOwner && existingOwner !== sourceUser.id) {
        failures.push(
          toAuditFailure(
            sourceUser.id,
            normalizedEmail,
            'DUPLICATE_KEYCLOAK_USER_ID',
            `Duplicate keycloak_user_id ${sourceUser.keycloak_user_id} is already assigned to another user`,
            { keycloakUserId: sourceUser.keycloak_user_id }
          )
        );
      }

      seenKeycloakUserIds.set(sourceUser.keycloak_user_id, sourceUser.id);
    }

    if (localAuthCount > 1) {
      failures.push(
        toAuditFailure(
          sourceUser.id,
          normalizedEmail,
          'MULTIPLE_LOCAL_AUTH_ROWS',
          `User has ${localAuthCount} local auth rows`
        )
      );
    }

    const matchingUsers = await adminClient.findUsersByEmail(normalizedEmail);
    const exactEmailMatches = matchingUsers.filter(
      (item) => normalizeKeycloakEmail(item.email) === normalizedEmail
    );

    if (sourceUser.keycloak_user_id) {
      const byId = await adminClient.getUserById(sourceUser.keycloak_user_id);
      if (!byId) {
        failures.push(
          toAuditFailure(
            sourceUser.id,
            normalizedEmail,
            'BOUND_KEYCLOAK_USER_MISSING',
            `Local user is bound to missing Keycloak user ${sourceUser.keycloak_user_id}`,
            { keycloakUserId: sourceUser.keycloak_user_id }
          )
        );
      } else if (normalizeKeycloakEmail(byId.email) !== normalizedEmail) {
        failures.push(
          toAuditFailure(
            sourceUser.id,
            normalizedEmail,
            'KEYCLOAK_SUBJECT_EMAIL_MISMATCH',
            `Bound Keycloak user ${sourceUser.keycloak_user_id} has email ${byId.email}`,
            { keycloakUserId: sourceUser.keycloak_user_id, keycloakEmail: byId.email }
          )
        );
      }
    }

    if (
      sourceUser.keycloak_user_id &&
      exactEmailMatches.some((item) => item.id !== sourceUser.keycloak_user_id)
    ) {
      failures.push(
        toAuditFailure(
          sourceUser.id,
          normalizedEmail,
          'CONFLICTING_KEYCLOAK_EMAIL',
          'Keycloak already has the same email on a different subject',
          {
            keycloakUserId: sourceUser.keycloak_user_id,
            existingKeycloakIds: exactEmailMatches.map((item) => item.id),
          }
        )
      );
    } else if (!sourceUser.keycloak_user_id && exactEmailMatches.length > 0) {
      infos.push({
        userId: sourceUser.id,
        email: normalizedEmail,
        code: 'KEYCLOAK_EMAIL_ALREADY_EXISTS',
        keycloakUserIds: exactEmailMatches.map((item) => item.id),
      });
    }
  }

  for (const [email, userIds] of usersByEmail.entries()) {
    if (userIds.length > 1) {
      for (const userId of userIds) {
        failures.push(
          toAuditFailure(
            userId,
            email,
            'DUPLICATE_EMAIL',
            `Duplicate email ${email} appears ${userIds.length} times`
          )
        );
      }
    }
  }

  return {
    failures,
    infos,
    ok: failures.length === 0,
  };
}

async function migrateSingleUser({
  sourceUser,
  adminClient,
  bindKeycloakUserId,
  roleCache,
  dryRun,
  batchId,
}) {
  const normalizedEmail = sourceUser.normalized_email;

  if (!normalizedEmail) {
    return {
      userId: sourceUser.id,
      email: sourceUser.email,
      status: 'failed',
      reason: 'User is missing email',
      passwordResetRequired: false,
    };
  }

  if (sourceUser.keycloak_user_id) {
    const boundUser = await adminClient.getUserById(sourceUser.keycloak_user_id);
    if (boundUser) {
      if (!dryRun) {
        await syncManagedRoles(adminClient, sourceUser, sourceUser.keycloak_user_id, roleCache);
      }
      return {
        userId: sourceUser.id,
        email: normalizedEmail,
        status: 'skipped',
        keycloakUserId: sourceUser.keycloak_user_id,
        reason: 'Already bound to an existing Keycloak user',
        passwordResetRequired: false,
      };
    }
  }

  const existingByEmail = (await adminClient.findUsersByEmail(normalizedEmail)).find(
    (item) => normalizeKeycloakEmail(item.email) === normalizedEmail
  );

  if (existingByEmail) {
    if (!dryRun) {
      await bindKeycloakUserId(sourceUser.id, existingByEmail.id);
      await syncManagedRoles(adminClient, sourceUser, existingByEmail.id, roleCache);
    }

    return {
      userId: sourceUser.id,
      email: normalizedEmail,
      status: 'bound_existing',
      keycloakUserId: existingByEmail.id,
      reason: 'Bound local user to existing Keycloak account by email',
      passwordResetRequired: false,
    };
  }

  const createPayload = buildKeycloakCreatePayload(sourceUser, batchId, true);
  const fallbackPayload = buildKeycloakCreatePayload(sourceUser, batchId, false);
  const hasImportedPassword = Boolean(sourceUser.local_auth_accounts[0]?.password_hash);
  const requiresPasswordResetWithoutImport = !hasImportedPassword;

  if (dryRun) {
    return {
      userId: sourceUser.id,
      email: normalizedEmail,
      status: 'created',
      keycloakUserId: null,
      reason: 'Dry run only',
      passwordResetRequired: requiresPasswordResetWithoutImport,
    };
  }

  const { user, passwordResetRequired } = hasImportedPassword
    ? await adminClient.createUserWithPasswordFallback({
        userPayload: createPayload,
        fallbackPayload: {
          ...fallbackPayload,
          requiredActions: ['UPDATE_PASSWORD'],
        },
      })
    : {
        user: await adminClient.createUser({
          ...fallbackPayload,
          requiredActions: ['UPDATE_PASSWORD'],
        }),
        passwordResetRequired: true,
      };

  await bindKeycloakUserId(sourceUser.id, user.id);
  await syncManagedRoles(adminClient, sourceUser, user.id, roleCache);

  return {
    userId: sourceUser.id,
    email: normalizedEmail,
    status: 'created',
    keycloakUserId: user.id,
    reason: 'Created Keycloak user and bound local account',
    passwordResetRequired,
  };
}

async function syncManagedRoles(adminClient, sourceUser, keycloakUserId, roleCache) {
  const roleNames = getManagedRoleNames(sourceUser);
  if (roleNames.length === 0) {
    return;
  }

  const currentRoleNames = new Set(await adminClient.getUserRealmRoleNames(keycloakUserId));
  const rolesToAdd = [];

  for (const roleName of roleNames) {
    if (currentRoleNames.has(roleName)) {
      continue;
    }

    if (!roleCache.has(roleName)) {
      const role = await adminClient.getRealmRole(roleName);
      if (!role) {
        throw new Error(`Required Keycloak realm role "${roleName}" does not exist`);
      }
      roleCache.set(roleName, role);
    }

    rolesToAdd.push(roleCache.get(roleName));
  }

  await adminClient.addRealmRolesToUser(keycloakUserId, rolesToAdd);
}

async function verifyUsers(sourceUsers, adminClient) {
  const failures = [];
  let activeCount = 0;
  let disabledCount = 0;

  for (const sourceUser of sourceUsers) {
    if (sourceUser.status === 'active') {
      activeCount += 1;
    } else {
      disabledCount += 1;
    }

    if (!sourceUser.keycloak_user_id) {
      failures.push({
        userId: sourceUser.id,
        email: sourceUser.normalized_email,
        code: 'MISSING_LOCAL_BINDING',
        message: 'Local user is missing keycloak_user_id',
      });
      continue;
    }

    const keycloakUser = await adminClient.getUserById(sourceUser.keycloak_user_id);
    if (!keycloakUser) {
      failures.push({
        userId: sourceUser.id,
        email: sourceUser.normalized_email,
        code: 'MISSING_KEYCLOAK_USER',
        message: `Keycloak user ${sourceUser.keycloak_user_id} was not found`,
      });
      continue;
    }

    if (normalizeKeycloakEmail(keycloakUser.email) !== sourceUser.normalized_email) {
      failures.push({
        userId: sourceUser.id,
        email: sourceUser.normalized_email,
        code: 'EMAIL_MISMATCH',
        message: `Keycloak user email ${keycloakUser.email} does not match local email ${sourceUser.normalized_email}`,
      });
    }

    if (Boolean(keycloakUser.enabled) !== (sourceUser.status === 'active')) {
      failures.push({
        userId: sourceUser.id,
        email: sourceUser.normalized_email,
        code: 'STATUS_MISMATCH',
        message: `Keycloak enabled=${Boolean(keycloakUser.enabled)} does not match local status ${sourceUser.status}`,
      });
    }

    const expectedRoles = getManagedRoleNames(sourceUser);
    const actualRoles = await adminClient.getUserRealmRoleNames(sourceUser.keycloak_user_id);
    const missingRoles = expectedRoles.filter((roleName) => !actualRoles.includes(roleName));

    if (missingRoles.length > 0) {
      failures.push({
        userId: sourceUser.id,
        email: sourceUser.normalized_email,
        code: 'MISSING_MANAGED_ROLES',
        message: `Keycloak user is missing managed roles: ${missingRoles.join(', ')}`,
      });
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    counts: {
      total: sourceUsers.length,
      active: activeCount,
      disabled: disabledCount,
    },
  };
}

module.exports = {
  auditUsers,
  buildImportedPasswordCredential,
  buildKeycloakCreatePayload,
  getManagedRoleNames,
  migrateSingleUser,
  summarizeResults,
  verifyUsers,
};
