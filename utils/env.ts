import path from 'path';
import dotenv from 'dotenv';

const environment = process.env.ENV || 'test';
const envFile = `.env.${environment}`;

// Resolve the env file from the project root (one level above /utils),
// NOT from process.cwd(). Without this, the tests only pick up .env.test
// when launched from inside the project folder — running them from your
// own terminal, an IDE test runner, or a parent directory would fail with
// "Missing environment variable". Real environment variables / CI secrets
// still take precedence, and are used as-is when the file is absent.
dotenv.config({
  path: path.resolve(__dirname, '..', envFile),
});

function required(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing environment variable: ${name}. Please check your .env file or CI/CD secrets.`
    );
  }

  return value;
}

function requiredUrl(name: string): string {
  const value = required(name).replace(/\/+$/, '');

  try {
    new URL(value);
  } catch {
    throw new Error(
      `Environment variable ${name} is not a valid URL: "${value}". Check your .env file or CI/CD secrets.`
    );
  }

  return value;
}

// These tests create, edit and bulk-delete users. Refuse to run against a
// production-looking environment unless explicitly allowed.
if (/^(prod|production|live)$/i.test(environment) && process.env.ALLOW_PROD !== '1') {
  throw new Error(
    `Refusing to run destructive tests against "${environment}". Set ALLOW_PROD=1 to override.`
  );
}

export const env = {
  ENVIRONMENT: environment,
  BASE_URL: requiredUrl('BASE_URL'),
  // SG_-prefixed: plain USERNAME is already set by Windows to the OS user,
  // and dotenv never overrides an existing variable.
  USERNAME: required('SG_USERNAME'),
  PASSWORD: required('SG_PASSWORD'),
};
