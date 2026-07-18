import dotenv from 'dotenv';

dotenv.config();

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
  BASE_URL: required('BASE_URL'),
  USERNAME: required('USERNAME'),
  PASSWORD: required('PASSWORD'),
};