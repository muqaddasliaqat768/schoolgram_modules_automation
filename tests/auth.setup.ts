import { test, expect } from '@playwright/test';
import fs from 'fs';

import { env } from '../utils/env';
import logger from '../utils/logger';

import {
  STORAGE_STATE,
  SESSION_TIMEOUT_MESSAGE,
  SERVER_ERRORS,
  SERVER_ERROR_MESSAGE,
  INVALID_LOGIN_REGEX,
} from '../utils/constants';

import { login } from '../utils/login';


test('Authenticate User', async ({ page }) => {


  // ------------------------------------------------------------
  // STEP 1: Open Login Page + Check Server
  // ------------------------------------------------------------

  await test.step('Open Login Page', async () => {

    logger.info('Opening login page...');


    const response =
      await page.goto(
        `${env.BASE_URL}/login/index.php`,
        {
          waitUntil:'networkidle',
        }
      );


    logger.info('Checking server status...');


    const body =
      await page.textContent('body');


    if(
      !response ||
      response.status() >= 500 ||
      SERVER_ERRORS.some(
        error => body?.includes(error)
      )
    ){

      logger.error(
        SERVER_ERROR_MESSAGE
      );

      throw new Error(
        SERVER_ERROR_MESSAGE
      );

    }


    logger.info(
      'Server is healthy.'
    );


  });



  // ------------------------------------------------------------
  // STEP 2: Login
  // ------------------------------------------------------------

  await test.step('Login', async()=>{


    await login(page);


  });



  // ------------------------------------------------------------
  // STEP 3: Handle Session Timeout
  // ------------------------------------------------------------

  await test.step(
    'Handle Session Timeout',
    async()=>{


    const sessionExpired =
      page.getByText(
        SESSION_TIMEOUT_MESSAGE
      );


    if(
      await sessionExpired
      .isVisible()
      .catch(()=>false)
    ){


      logger.warn(
        'Session expired. Reloading page...'
      );


      await page.reload({
        waitUntil:'networkidle'
      });



      const body =
        await page.textContent('body');



      if(
        SERVER_ERRORS.some(
          error => body?.includes(error)
        )
      ){

        logger.error(
          SERVER_ERROR_MESSAGE
        );


        throw new Error(
          SERVER_ERROR_MESSAGE
        );

      }



      await login(page);



      logger.info(
        'Login successful after session timeout.'
      );


    }


  });



  // ------------------------------------------------------------
  // STEP 4: Invalid Credentials Check
  // ------------------------------------------------------------

  await test.step(
    'Verify Login Credentials',
    async()=>{


    const invalidLogin =
      page.getByText(
        INVALID_LOGIN_REGEX
      );



    if(
      await invalidLogin
      .isVisible()
      .catch(()=>false)
    ){

      logger.error(
        'Invalid username or password'
      );


      throw new Error(
        'Invalid username or password'
      );

    }



    logger.info(
      'Login credentials are valid.'
    );


  });



  // ------------------------------------------------------------
  // STEP 5: Verify Successful Login
  // ------------------------------------------------------------

  await test.step(
    'Verify Successful Login',
    async()=>{


    logger.info(
      'Verifying dashboard URL...'
    );


    await expect(
      page
    ).toHaveURL(
      /\/my\//
    );



    logger.info(
      'Login successful.'
    );


  });



  // ------------------------------------------------------------
  // STEP 6: Save Authentication State
  // ------------------------------------------------------------

  await test.step(
    'Save Authentication State',
    async()=>{


    logger.info(
      'Creating authentication directory...'
    );


    fs.mkdirSync(
      'playwright/.auth',
      {
        recursive:true
      }
    );



    logger.info(
      'Saving authentication state...'
    );


    await page.context()
      .storageState({
        path: STORAGE_STATE
      });



    logger.info(
      'Authentication state saved successfully.'
    );


  });



});