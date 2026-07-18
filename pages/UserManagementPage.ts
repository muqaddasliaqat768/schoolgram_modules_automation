import { expect, Locator, Page } from '@playwright/test';
import { MENU } from '../utils/constants';
import { User } from '../types/user';

export class UserManagementPage {

  readonly page: Page;

  readonly userManagementLink: Locator;
  readonly createUserButton: Locator;
  readonly submitButton: Locator;

  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly usernameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;

  readonly searchBox: Locator;
  readonly clearSearchButton: Locator;
  readonly noRecordsMessage: Locator;

  readonly uploadButton: Locator;
  readonly fileInput: Locator;


  constructor(page: Page) {

    this.page = page;


    this.userManagementLink =
      page.getByRole('link', {
        name: MENU.USER_MANAGEMENT
      });


    this.createUserButton =
      page.getByRole('button',{
        name:/Create New User/i
      });


    this.submitButton =
      page.getByRole('button',{
        name:'Submit'
      });


    this.firstNameInput =
      page.getByRole('textbox',{
        name:'First Name'
      });


    this.lastNameInput =
      page.getByRole('textbox',{
        name:'Last Name'
      });


    this.usernameInput =
      page.getByRole('textbox',{
        name:'Username'
      });


    this.emailInput =
      page.getByRole('textbox',{
        name:'Email'
      });


    this.passwordInput =
      page.getByRole('textbox',{
        name:'Password'
      });


    this.searchBox =
      page.getByRole('textbox',{
        name:'Search users'
      });


    this.clearSearchButton =
      page.getByRole('button',{
        name:'clear'
      });


    this.noRecordsMessage =
      page.getByText(
        'User records not found!'
      );


    this.uploadButton =
      page.getByRole('button',{
        name:'Upload Users (csv)'
      });


    this.fileInput =
      page.locator(
        'input[type="file"]'
      );

  }


  async open(){

    await expect(
      this.userManagementLink
    ).toBeVisible();

    await this.userManagementLink.click();

  }


  async openCreateUser(){

    await this.createUserButton.click();

  }


  async fillRequiredFields(user: User){

    await this.firstNameInput.fill(
      user.firstName
    );

    await this.lastNameInput.fill(
      user.lastName
    );

    await this.usernameInput.fill(
      user.username
    );

    await this.emailInput.fill(
      user.email
    );

  }


  async submit(){

    await this.submitButton.click();

  }


  async uploadFile(filePath:string){

    await this.fileInput.setInputFiles(
      filePath
    );

  }


}