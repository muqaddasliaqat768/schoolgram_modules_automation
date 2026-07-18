//Created for login functionality to avoid code duplication in tests/auth.setup.ts in case of multiple login scenerios like as a user, as a admin etc.
import { Page } from '@playwright/test';
import { env } from './env';
import logger from './logger';


export async function login(page: Page) {

  logger.info('Entering username');

  await page
    .getByRole('textbox', {
      name: 'Username or email'
    })
    .fill(env.USERNAME);


  logger.info('Entering password');

  await page
    .getByRole('textbox', {
      name: 'Password'
    })
    .fill(env.PASSWORD);


  logger.info('Submitting login');

  await page
    .getByRole('button',{
      name:'Log in'
    })
    .click();


}