const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const { Users, AuthAccounts } = require('@models');
const logger = require('@config/logger.config');
const { getCallbackUrl } = require('@utils/oauth.utils');
const { findOrCreateOAuthUser } = require('@helpers/oauth.helper');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: getCallbackUrl('google'),
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const email =
          profile.emails && profile.emails.length > 0
            ? profile.emails[0].value.toLowerCase()
            : null;
        const firstName = profile.name?.givenName || '';
        const lastName = profile.name?.familyName || '';

        const user = await findOrCreateOAuthUser({
          provider: 'google',
          providerUserId: profile.id,
          email,
          firstName,
          lastName,
        });

        done(null, user);
      } catch (err) {
        logger.error({ err }, 'Google OAuth failed');
        done(err);
      }
    }
  )
);

passport.use(
  new TwitterStrategy(
    {
      consumerKey: process.env.TWITTER_CLIENT_ID,
      consumerSecret: process.env.TWITTER_CLIENT_SECRET,
      callbackURL: getCallbackUrl('twitter'),
      includeEmail: true,
      passReqToCallback: true,
    },
    async (req, token, tokenSecret, profile, done) => {
      try {
        const email =
          profile.emails && profile.emails.length > 0
            ? profile.emails[0].value.toLowerCase()
            : null;
        const displayName = profile.displayName || '';
        const [firstName, ...rest] = displayName.split(' ');
        const lastName = rest.join(' ') || '';

        const user = await findOrCreateOAuthUser({
          provider: 'twitter',
          providerUserId: profile.id,
          email,
          firstName,
          lastName,
        });

        done(null, user);
      } catch (err) {
        logger.error({ err }, 'Twitter OAuth failed');
        done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await Users.findByPk(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
