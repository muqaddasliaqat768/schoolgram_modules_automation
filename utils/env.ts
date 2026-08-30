// ---------------------------------------------------------------------------
// Single source of truth for host-specific configuration.
//
// Reads .env.${ENV} (ENV defaults to "test", so .env.test locally). The three
// values below are REQUIRED — a missing one fails fast with a clear message
// instead of a confusing mid-test error. In CI there is no .env file; the same
// names are provided as CI/CD variables (see .gitlab-ci.yml).
//
// Never hard-code BASE_URL / USERNAME / PASSWORD anywhere else — import `env`.
// ---------------------------------------------------------------------------

import dotenv from 'dotenv';

// Pick the env file by ENV (test | demo | …); defaults to the test environment.
const environment = process.env.ENV || 'test';
const envFile = `.env.${environment}`;

dotenv.config({
  path: envFile,
});

function required(name: string): string {
  const value = process.env[name];

  //incase if Missing environment variable: BASE_URL
  if (!value) {
    throw new Error(
      `Missing environment variable: ${name}. Please check your .env file or CI/CD secrets.`
    );
  }

  return value;
}

export const env = {
  ENVIRONMENT: environment,
  BASE_URL: required('BASE_URL'),
  USERNAME: required('USERNAME'),
  PASSWORD: required('PASSWORD'),
};