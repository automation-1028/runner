import * as Sentry from '@sentry/node';

Sentry.init({
  dsn:
    process.env.SENTRY_DSN ||
    'https://9f0b0de683c0cff22f3b4263aee8f412@o876734.ingest.us.sentry.io/4508761836093440',
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 1.0,
  enabled: process.env.NODE_ENV === 'production',
});

export default Sentry;
