require('../../../../register-aliases');

const {
  auditUsers,
  buildKeycloakCreatePayload,
  buildImportedPasswordCredential,
  getManagedRoleNames,
  migrateSingleUser,
  summarizeResults,
  verifyUsers,
} = require('../../../../scripts/keycloak/lib/migration-core');

function createSourceUser(overrides = {}) {
  return {
    id: 'user-1',
    email: 'User@example.com',
    normalized_email: 'user@example.com',
    first_name: 'Test',
    last_name: 'User',
    status: 'active',
    email_verified_at: new Date().toISOString(),
    keycloak_user_id: null,
    auth_provider_names: ['local'],
    local_auth_accounts: [
      {
        provider: 'local',
        password_hash: '$2a$10$abcdefghijklmnopqrstuv',
      },
    ],
    managed_role_names: ['user'],
    ...overrides,
  };
}

function createAdminClientMock(overrides = {}) {
  return {
    findUsersByEmail: jest.fn().mockResolvedValue([]),
    getUserById: jest.fn().mockResolvedValue(null),
    createUser: jest.fn(),
    createUserWithPasswordFallback: jest.fn(),
    getRealmRole: jest.fn().mockResolvedValue({ id: 'role-1', name: 'user' }),
    getUserRealmRoleNames: jest.fn().mockResolvedValue([]),
    addRealmRolesToUser: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('keycloak migration core', () => {
  describe('buildImportedPasswordCredential', () => {
    it('builds a Keycloak bcrypt credential payload', () => {
      const credential = buildImportedPasswordCredential('$2a$10$hash');

      expect(credential.type).toBe('password');
      expect(JSON.parse(credential.credentialData)).toEqual({
        algorithm: 'bcrypt',
        hashIterations: 10,
      });
      expect(JSON.parse(credential.secretData)).toEqual({
        value: '$2a$10$hash',
      });
    });
  });

  describe('buildKeycloakCreatePayload', () => {
    it('builds the imported-password payload for active users', () => {
      const payload = buildKeycloakCreatePayload(createSourceUser(), 'batch-1', true);

      expect(payload).toMatchObject({
        username: 'user@example.com',
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
        enabled: true,
        emailVerified: true,
      });
      expect(payload.credentials).toHaveLength(1);
      expect(payload.requiredActions).toBeUndefined();
      expect(payload.attributes.legacy_user_id).toEqual(['user-1']);
    });

    it('forces password reset when no local password exists', () => {
      const payload = buildKeycloakCreatePayload(
        createSourceUser({
          local_auth_accounts: [],
          auth_provider_names: ['google'],
        }),
        'batch-1',
        false
      );

      expect(payload.credentials).toBeUndefined();
      expect(payload.requiredActions).toEqual(['UPDATE_PASSWORD']);
    });
  });

  describe('getManagedRoleNames', () => {
    it('returns only managed global roles', () => {
      const roleNames = getManagedRoleNames(
        createSourceUser({
          managed_role_names: ['user', 'owner', 'support_agent', 'staff'],
        })
      );

      expect(roleNames).toEqual(['user', 'support_agent']);
    });
  });

  describe('auditUsers', () => {
    it('fails when duplicate local email and missing bound Keycloak subject are found', async () => {
      const adminClient = createAdminClientMock({
        getUserById: jest.fn().mockResolvedValue(null),
      });
      const sourceUsers = [
        createSourceUser({
          id: 'user-1',
          keycloak_user_id: 'kc-1',
        }),
        createSourceUser({
          id: 'user-2',
        }),
      ];

      const result = await auditUsers(sourceUsers, adminClient);

      expect(result.ok).toBe(false);
      expect(result.failures).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'BOUND_KEYCLOAK_USER_MISSING' }),
          expect.objectContaining({ code: 'DUPLICATE_EMAIL' }),
        ])
      );
    });

    it('reports existing Keycloak email as informational when it can be bound later', async () => {
      const adminClient = createAdminClientMock({
        findUsersByEmail: jest.fn().mockResolvedValue([{ id: 'kc-1', email: 'user@example.com' }]),
      });

      const result = await auditUsers([createSourceUser()], adminClient);

      expect(result.ok).toBe(true);
      expect(result.infos).toEqual([
        expect.objectContaining({ code: 'KEYCLOAK_EMAIL_ALREADY_EXISTS' }),
      ]);
    });
  });

  describe('migrateSingleUser', () => {
    it('binds an existing Keycloak user by email instead of creating a duplicate', async () => {
      const bindKeycloakUserId = jest.fn();
      const adminClient = createAdminClientMock({
        findUsersByEmail: jest
          .fn()
          .mockResolvedValue([{ id: 'kc-123', email: 'user@example.com' }]),
      });

      const result = await migrateSingleUser({
        sourceUser: createSourceUser(),
        adminClient,
        bindKeycloakUserId,
        roleCache: new Map(),
        dryRun: false,
        batchId: 'batch-1',
      });

      expect(result.status).toBe('bound_existing');
      expect(bindKeycloakUserId).toHaveBeenCalledWith('user-1', 'kc-123');
      expect(adminClient.createUser).not.toHaveBeenCalled();
    });

    it('creates a user with password-reset fallback when imported hash is rejected', async () => {
      const bindKeycloakUserId = jest.fn();
      const adminClient = createAdminClientMock({
        createUserWithPasswordFallback: jest.fn().mockResolvedValue({
          user: { id: 'kc-456', email: 'user@example.com' },
          passwordResetRequired: true,
        }),
      });

      const result = await migrateSingleUser({
        sourceUser: createSourceUser(),
        adminClient,
        bindKeycloakUserId,
        roleCache: new Map(),
        dryRun: false,
        batchId: 'batch-1',
      });

      expect(result.status).toBe('created');
      expect(result.passwordResetRequired).toBe(true);
      expect(bindKeycloakUserId).toHaveBeenCalledWith('user-1', 'kc-456');
    });

    it('skips already bound users when the Keycloak subject still exists', async () => {
      const adminClient = createAdminClientMock({
        getUserById: jest.fn().mockResolvedValue({ id: 'kc-1', email: 'user@example.com' }),
      });

      const result = await migrateSingleUser({
        sourceUser: createSourceUser({
          keycloak_user_id: 'kc-1',
        }),
        adminClient,
        bindKeycloakUserId: jest.fn(),
        roleCache: new Map(),
        dryRun: false,
        batchId: 'batch-1',
      });

      expect(result.status).toBe('skipped');
    });
  });

  describe('verifyUsers', () => {
    it('fails when a bound user is missing required managed roles', async () => {
      const adminClient = createAdminClientMock({
        getUserById: jest.fn().mockResolvedValue({
          id: 'kc-1',
          email: 'user@example.com',
          enabled: true,
        }),
        getUserRealmRoleNames: jest.fn().mockResolvedValue([]),
      });

      const result = await verifyUsers(
        [
          createSourceUser({
            keycloak_user_id: 'kc-1',
            managed_role_names: ['admin'],
          }),
        ],
        adminClient
      );

      expect(result.ok).toBe(false);
      expect(result.failures).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'MISSING_MANAGED_ROLES' })])
      );
    });
  });

  describe('summarizeResults', () => {
    it('counts migration outcomes and password resets', () => {
      const summary = summarizeResults([
        { status: 'created', passwordResetRequired: true },
        { status: 'created', passwordResetRequired: false },
        { status: 'bound_existing', passwordResetRequired: false },
        { status: 'skipped', passwordResetRequired: false },
        { status: 'failed', passwordResetRequired: false },
      ]);

      expect(summary).toEqual({
        created: 2,
        bound_existing: 1,
        skipped: 1,
        failed: 1,
        password_reset_required: 1,
      });
    });
  });
});
