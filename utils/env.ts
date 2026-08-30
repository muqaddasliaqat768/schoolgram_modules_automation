import dotenv from 'dotenv';

const environment = process.env.ENV || 'test';
const envFile = `.env.${environment}`;

dotenv.config({
  path: envFile,
});

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing environment variable: ${name}. Please check your .env file or CI/CD secrets.`
    );
  }

  return value;
}

export const env = {
  ENVIRONMENT: environment,
  BASE_URL: process.env.BASE_URL!,
  USERNAME: process.env.USERNAME!,
  PASSWORD: process.env.PASSWORD!,
};
