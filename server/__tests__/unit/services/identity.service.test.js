const ApiError = require('@utils/ApiError');

jest.mock('@repositories/auth.repository', () => ({
  findByKeycloakUserId: jest.fn(),
  findByEmail: jest.fn(),
  createUser: jest.fn(),
  bindKeycloakUserId: jest.fn(),
  findRolesByNames: jest.fn(),
  replaceManagedUserRoles: jest.fn(),
  updateLastLogin: jest.fn(),
  getUserWithContext: jest.fn(),
}));

const authRepository = require('@repositories/auth.repository');
const identityService = require('@services/identity.service');

describe('IdentityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveAuthenticatedUser', () => {
    it('rejects unverified Keycloak identities before local provisioning', async () => {
      await expect(
        identityService.resolveAuthenticatedUser({
          subject: 'kc-user-1',
          email: 'user@example.com',
          roles: ['user'],
          payload: { email_verified: false },
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'EMAIL_VERIFICATION_REQUIRED',
      });

      expect(authRepository.findByKeycloakUserId).not.toHaveBeenCalled();
      expect(authRepository.findByEmail).not.toHaveBeenCalled();
      expect(authRepository.createUser).not.toHaveBeenCalled();
    });

    it('binds an existing local user by email on first verified login', async () => {
      const localUser = { id: 'user-1', email: 'user@example.com', keycloak_user_id: null };
      const hydratedUser = {
        id: 'user-1',
        email: 'user@example.com',
        status: 'active',
        roles: [{ role: { name: 'user' } }],
        hotel_roles: [],
      };

      authRepository.findByKeycloakUserId.mockResolvedValue(null);
      authRepository.findByEmail.mockResolvedValue(localUser);
      authRepository.findRolesByNames.mockResolvedValue([{ id: 'role-1', name: 'user' }]);
      authRepository.getUserWithContext.mockResolvedValue(hydratedUser);

      const result = await identityService.resolveAuthenticatedUser({
        subject: 'kc-user-1',
        email: 'USER@example.com',
        roles: ['user'],
        payload: { email_verified: true, given_name: 'Casey', family_name: 'Jones' },
      });

      expect(authRepository.bindKeycloakUserId).toHaveBeenCalledWith('user-1', 'kc-user-1');
      expect(authRepository.createUser).not.toHaveBeenCalled();
      expect(authRepository.replaceManagedUserRoles).toHaveBeenCalledWith(
        'user-1',
        ['role-1'],
        ['role-1']
      );
      expect(authRepository.updateLastLogin).toHaveBeenCalledWith('user-1');
      expect(result).toBe(hydratedUser);
    });

    it('rejects rebinding when the email already belongs to another Keycloak subject', async () => {
      authRepository.findByKeycloakUserId.mockResolvedValue(null);
      authRepository.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        keycloak_user_id: 'kc-other',
      });

      await expect(
        identityService.resolveAuthenticatedUser({
          subject: 'kc-user-1',
          email: 'user@example.com',
          roles: ['user'],
          payload: { email_verified: true },
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'KEYCLOAK_SUBJECT_MISMATCH',
      });

      expect(authRepository.bindKeycloakUserId).not.toHaveBeenCalled();
      expect(authRepository.createUser).not.toHaveBeenCalled();
    });

    it('creates a verified local user when no binding exists', async () => {
      const createdUser = { id: 'user-2' };
      const hydratedUser = {
        id: 'user-2',
        email: 'fresh@example.com',
        status: 'active',
        roles: [{ role: { name: 'user' } }],
        hotel_roles: [],
      };

      authRepository.findByKeycloakUserId.mockResolvedValue(null);
      authRepository.findByEmail.mockResolvedValue(null);
      authRepository.createUser.mockResolvedValue(createdUser);
      authRepository.findRolesByNames.mockResolvedValue([{ id: 'role-1', name: 'user' }]);
      authRepository.getUserWithContext.mockResolvedValue(hydratedUser);

      const result = await identityService.resolveAuthenticatedUser({
        subject: 'kc-user-2',
        email: 'fresh@example.com',
        roles: [],
        payload: { email_verified: true, name: 'Fresh User' },
      });

      expect(authRepository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          keycloak_user_id: 'kc-user-2',
          email: 'fresh@example.com',
          status: 'active',
        })
      );
      expect(authRepository.createUser.mock.calls[0][0].email_verified_at).toBeInstanceOf(Date);
      expect(result).toBe(hydratedUser);
    });

    it('propagates downstream provisioning failures', async () => {
      authRepository.findByKeycloakUserId.mockResolvedValue(null);
      authRepository.findByEmail.mockResolvedValue(null);
      authRepository.createUser.mockRejectedValue(
        new ApiError(500, 'USER_CREATE_FAILED', 'User creation failed')
      );

      await expect(
        identityService.resolveAuthenticatedUser({
          subject: 'kc-user-3',
          email: 'broken@example.com',
          roles: ['user'],
          payload: { email_verified: true },
        })
      ).rejects.toMatchObject({
        statusCode: 500,
        code: 'USER_CREATE_FAILED',
      });
    });
  });
});
