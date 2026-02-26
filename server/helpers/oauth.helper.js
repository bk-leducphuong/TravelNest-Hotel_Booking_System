const { Users, AuthAccounts } = require('@models');

async function findOrCreateOAuthUser({ provider, providerUserId, email, firstName, lastName }) {
  let authAccount = await AuthAccounts.findOne({
    where: {
      provider,
      provider_user_id: providerUserId,
    },
    include: [
      {
        model: Users,
        as: 'user',
      },
    ],
  });

  if (authAccount && authAccount.user) {
    return authAccount.user;
  }

  let user = null;
  if (email) {
    user = await Users.findOne({ where: { email } });
  }

  if (!user) {
    user = await Users.create({
      email: email || null,
      first_name: firstName || '',
      last_name: lastName || '',
      status: 'active',
    });
  }

  await AuthAccounts.create({
    user_id: user.id,
    provider,
    provider_user_id: providerUserId,
    password_hash: null,
  });

  return user;
}
