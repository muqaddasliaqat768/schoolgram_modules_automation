import * as path from 'path';
import { expect, Locator, Page, Response } from '@playwright/test';
import { MENU, ROUTES } from '../utils/constants';
import { User } from '../types/user';

const POLL = {
  LIST_SETTLE: { timeout: 15_000, intervals: [200] },

  NARROW_ROW: { timeout: 45_000, intervals: [1_000, 2_000, 3_000, 5_000] },
  NARROW_ROW_ATTEMPT_MS: 5_000,

  USER_GONE: { timeout: 30_000, intervals: [1_000, 2_000, 3_000] },

  UPLOAD_JOB: { timeout: 180_000, intervals: [3_000] },
};

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

  readonly courseCategorySelect: Locator;
  readonly availableCoursesList: Locator;
  readonly enrolledCoursesList: Locator;
  readonly enrollButton: Locator;
  readonly usersListBreadcrumbLink: Locator;

  readonly editProfileButton: Locator;
  readonly updateProfileButton: Locator;
  readonly goBackButton: Locator;

  readonly profileFirstNameInput: Locator;
  readonly profileLastNameInput: Locator;
  readonly profileEmailInput: Locator;

  readonly successModal: Locator;
  readonly modalOkButton: Locator;

  readonly exportCsvButton: Locator;
  readonly exportModal: Locator;
  readonly exportModalExportButton: Locator;

  readonly bulkDeleteButton: Locator;

  readonly chooseFileButton: Locator;
  readonly uploadUsersSubmitButton: Locator;
  readonly uploadModeDialog: Locator;
  readonly uploadRefreshButton: Locator;
  readonly uploadCompleteBanner: Locator;
  readonly uploadPreviewFooter: Locator;

  readonly customLoader: Locator;


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


    this.courseCategorySelect =
      page
        .locator('.react-select-container')
        .filter({ hasText: 'Course Category' });


    this.availableCoursesList =
      page.locator('.course-list-container').first();


    this.enrolledCoursesList =
      page.locator('.course-list-container').last();


    this.enrollButton =
      page.getByRole('button',{
        name:/(Enroll|Assign) \(\d+\)/
      });


    this.usersListBreadcrumbLink =
      page.getByRole('link',{
        name:'Users List'
      });


    this.editProfileButton =
      page.getByRole('button',{
        name:'Edit Profile'
      });


    this.updateProfileButton =
      page.getByRole('button',{
        name:'Update',
        exact:true
      });


    this.goBackButton =
      page.getByRole('button',{
        name:'Go Back'
      });


    this.profileFirstNameInput =
      page.getByPlaceholder('e.g., John', { exact: true });

    this.profileLastNameInput =
      page.getByPlaceholder('e.g., Doe', { exact: true });

    this.profileEmailInput =
      page.getByPlaceholder('e.g., john.doe@mail.com', { exact: true });


    this.successModal =
      page.locator('.swal2-popup');


    this.modalOkButton =
      page.locator('.swal2-confirm');


    this.customLoader =
      page.locator('#custom-loader-wrapper');


    this.exportCsvButton =
      page.getByRole('button',{
        name:'Export CSV'
      });


    this.exportModal =
      page.getByRole('dialog')
        .filter({ hasText: 'Export Users' });


    this.exportModalExportButton =
      this.exportModal.getByRole('button',{
        name:'Export',
        exact:true
      });


    this.bulkDeleteButton =
      page.getByRole('button',{
        name:'Bulk Delete Users'
      });


    this.chooseFileButton =
      page.getByRole('button',{
        name:'Choose File'
      });


    this.uploadUsersSubmitButton =
      page.getByRole('button',{
        name:'Upload Users',
        exact:true
      });


    this.uploadModeDialog =
      page.locator('.swal2-popup')
        .filter({ hasText: 'Please select upload type' });


    this.uploadRefreshButton =
      page.getByRole('button',{
        name:'Refresh'
      });


    this.uploadCompleteBanner =
      page.getByText(/upload complete/i);


    this.uploadPreviewFooter =
      page.getByText(/\d+ users loaded/i);

  }


  async waitForLoaderGone(){

    await expect(this.customLoader).toBeHidden({ timeout: 15000 });

  }


  swalPopup(text: string | RegExp): Locator {

    return this.page
      .locator('.swal2-popup')
      .filter({ hasText: text });

  }


  async open(){

    await expect(
      this.userManagementLink
    ).toBeVisible();

    await this.userManagementLink.click();

    await this.waitForLoaderGone();

  }


  async openCreateUser(){

    await this.waitForLoaderGone();

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


  async createUser(user: User){

    await this.openCreateUser();

    await this.fillRequiredFields(user);

    await this.passwordInput.fill(
      user.password
    );

    await this.submit();

  }


  async expectUserCreatedModal(){

    await expect(this.successModal).toBeVisible();

    await expect(this.successModal).toContainText(
      /User created succes?sfully!?/i
    );

  }


  async dismissModal(){

    await this.waitForLoaderGone();

    await this.modalOkButton.click();

    await expect(this.successModal).toHaveCount(0, { timeout: 15000 });

  }


  async selectFirstCourseCategory(){

    await this.waitForLoaderGone();

    await expect(this.courseCategorySelect).toBeVisible({ timeout: 30000 });

    await this.courseCategorySelect.click();

    const firstOption =
      this.page.getByRole('option').first();

    await expect(firstOption).toBeVisible();

    await firstOption.click();

    await this.waitForLoaderGone();

  }


  async enrollInFirstAvailableCourse(){

    const firstCourse =
      this.availableCoursesList
        .locator('p')
        .first();

    await expect(firstCourse).toBeVisible({ timeout: 30000 });

    const courseLabel =
      (await firstCourse.textContent())?.trim() ?? '';

    await firstCourse.click();

    await this.enrollButton.click();

    await expect(
      this.enrolledCoursesList.getByText(courseLabel)
    ).toBeVisible();

    await expect(
      this.availableCoursesList.getByText(courseLabel)
    ).toBeHidden();

    return courseLabel;

  }


  async goToUsersListViaBreadcrumb(){

    await this.waitForLoaderGone();

    await this.usersListBreadcrumbLink.click();

    await this.waitForLoaderGone();

  }


  async goToUploadUsersPage(){

    await this.waitForLoaderGone();

    await this.uploadButton.click();

    await this.page.waitForURL(ROUTES.UPLOAD_USERS);

    await this.waitForLoaderGone();

  }


  userRow(identifier: string): Locator {

    return this.page
      .getByRole('row')
      .filter({ hasText: identifier });

  }


  get dataRows(): Locator {

    return this.page.locator('tbody').getByRole('row');

  }


  private isFilteredGetUsers(res: Response, term: string): boolean {

    if (!res.url().includes('action=get_users') || !res.ok()) return false;

    const value = new URL(res.url()).searchParams.get('search') ?? '';

    return value.split('@')[0] === term;

  }


  async waitForListSettled(){

    const rows = this.dataRows;

    let previous = -1;
    let stable = 0;

    await expect
      .poll(
        async () => {
          const current = await rows.count();

          if (current === previous){
            stable += 1;
          } else {
            stable = 0;
            previous = current;
          }

          return stable;
        },
        POLL.LIST_SETTLE,
      )
      .toBeGreaterThanOrEqual(3)
      .catch(() => undefined);

  }


  async fireUserSearch(identifier: string){

    const term = identifier.split('@')[0];

    if ((await this.searchBox.inputValue()) !== ''){

      const cleared = this.page
        .waitForResponse(
          res => this.isFilteredGetUsers(res, ''),
          { timeout: 15000 }
        )
        .catch(() => undefined);

      await this.searchBox.fill('');

      await cleared;

      await this.waitForListSettled();

    }

    const filtered = this.page
      .waitForResponse(
        res => this.isFilteredGetUsers(res, term),
        { timeout: 15000 }
      )
      .catch(() => undefined);

    await this.searchBox.fill(identifier);

    await filtered;

    await this.waitForListSettled();

    await this.waitForLoaderGone();

  }


  async narrowToUserRow(identifier: string): Promise<Locator>{

    const row = this.userRow(identifier);

    await expect(async () => {

      await this.fireUserSearch(identifier);

      await expect(row).toHaveCount(1, { timeout: POLL.NARROW_ROW_ATTEMPT_MS });

    }).toPass(POLL.NARROW_ROW);

    return row;

  }


  async searchUser(identifier: string){

    await this.searchBox.fill(identifier);

    const marker = `search=${identifier.split('@')[0]}`;

    await this.page
      .waitForResponse(
        res =>
          res.url().includes('action=get_users') &&
          res.url().includes(marker) &&
          res.ok(),
        { timeout: 15000 }
      )
      .catch(() => undefined);

    await this.waitForLoaderGone();

  }


  async editUser(identifier: string){

    const row = await this.narrowToUserRow(identifier);

    await row.getByRole('link').first().click();

    await this.page.waitForURL(ROUTES.USER_PROFILE);

    await expect(
      this.page.getByText(identifier).first()
    ).toBeVisible();

    await this.editProfileButton.click();

    await expect(this.profileFirstNameInput).toBeVisible();

  }


  async updateProfile(fields: Pick<User, 'firstName' | 'lastName' | 'email'>){

    await this.profileFirstNameInput.fill(fields.firstName);

    await this.profileLastNameInput.fill(fields.lastName);

    await this.profileEmailInput.fill(fields.email);

    await this.updateProfileButton.click();

  }


  async expectProfileUpdatedModal(){

    await expect(this.successModal).toBeVisible();

    await expect(this.successModal).toContainText(
      /User updated succes?sfully!?/i
    );

  }


  async goBackToUsersList(){

    await this.goBackButton.click();

  }


  async deleteUser(identifier: string){

    await this.waitForLoaderGone();

    const row = this.userRow(identifier);

    if ((await row.count()) !== 1){
      await this.narrowToUserRow(identifier);
    }

    await row
      .locator('[class*="actionBtn"]')
      .nth(1)
      .click();

  }


  async expectDeleteConfirmModal(){

    await expect(this.swalPopup('Are you sure?')).toBeVisible();

  }


  async confirmDeletion(){

    const confirmPopup = this.swalPopup('Are you sure?');

    await confirmPopup.locator('.swal2-confirm').click();

    await expect(confirmPopup).toHaveCount(0, { timeout: 15000 });

  }


  async expectUserDeletedModal(){

    await expect(
      this.swalPopup(/User deleted succes?sfully!?/i)
    ).toBeVisible({ timeout: 15000 });

  }


  async openExportModal(){

    await this.waitForLoaderGone();

    await this.exportCsvButton.click();

    await expect(this.exportModal).toBeVisible();

  }


  async selectExportFields(fieldKeys: string[]){

    for (const key of fieldKeys){

      await this.exportModal.locator(`#export-field-${key}`).check();

    }

  }


  async selectAccountInfoFields(){

    await this.selectExportFields(['id', 'idnumber']);

  }


  async selectContactInfoFields(){

    await this.selectExportFields(['phone1', 'address']);

  }


  async selectEmergencyContactFields(){

    await this.selectExportFields(['emergency_name', 'emergency_phone']);

  }


  async exportAndGetDownload(){

    const downloadPromise =
      this.page.waitForEvent('download', { timeout: 30000 });

    await this.exportModalExportButton.click();

    return downloadPromise;

  }


  async selectUsersByUsername(usernames: readonly string[]){

    await this.waitForLoaderGone();

    await expect(this.dataRows).toHaveCount(usernames.length, { timeout: 15000 });

    for (const username of usernames){

      const row = this.userRow(username);

      await expect(row).toHaveCount(1, { timeout: 15000 });

      await row.getByRole('checkbox').check();

    }

    return [...usernames];

  }


  async clickBulkDelete(){

    await this.waitForLoaderGone();

    await this.bulkDeleteButton.click();

  }


  async expectBulkDeleteConfirmModal(){

    await expect(
      this.swalPopup('Are you sure you want to delete the selected users?')
    ).toBeVisible();

  }


  async confirmBulkDeletion(){

    const confirmPopup =
      this.swalPopup('Are you sure you want to delete the selected users?');

    await confirmPopup.locator('.swal2-confirm').click();

    await expect(confirmPopup).toHaveCount(0, { timeout: 15000 });

  }


  async expectBulkDeleteSuccessModal(){

    await expect(
      this.swalPopup(/Users deleted/i)
    ).toBeVisible({ timeout: 15000 });

  }


  async expectUserGone(identifier: string){

    await expect
      .poll(
        async () => {
          await this.fireUserSearch(identifier);
          return this.noRecordsMessage.isVisible();
        },
        {
          message: `user "${identifier}" still appears in the list after delete`,
          ...POLL.USER_GONE,
        }
      )
      .toBe(true);

  }


  async uploadCsvFile(fileName: string){

    await this.chooseFileButton.waitFor();

    await this.fileInput.setInputFiles(
      path.join(__dirname, '../test-data', fileName)
    );

    await expect(this.uploadPreviewFooter).toBeVisible({ timeout: 15000 });

  }


  async clickUploadUsers(){

    await this.waitForLoaderGone();

    await this.uploadUsersSubmitButton.first().click();

  }


  async selectUploadMode(mode: 'create' | 'update' | 'both'){

    const labels = {
      create: 'Create new users only',
      update: 'Update existing users only',
      both: 'Create new and updated existing users',
    };

    await expect(this.uploadModeDialog).toBeVisible();

    await this.uploadModeDialog
      .getByRole('button', { name: labels[mode], exact: true })
      .click();

  }


  async refreshUploadStatus(){

    await expect
      .poll(
        async () => {
          if (await this.uploadRefreshButton.isVisible()){
            await this.uploadRefreshButton.click({ timeout: 10000 }).catch(() => undefined);
          }
          return this.uploadCompleteBanner.isVisible();
        },
        {
          message: 'bulk upload job never reached the completion banner',
          ...POLL.UPLOAD_JOB,
        }
      )
      .toBe(true);

    if (await this.successModal.isVisible().catch(() => false)){
      await this.modalOkButton.first().click().catch(() => undefined);
      await expect(this.successModal).toHaveCount(0, { timeout: 10000 }).catch(() => undefined);
    }

  }


  async expectUploadComplete(){

    await expect(this.uploadCompleteBanner).toBeVisible({ timeout: 10000 });

  }


  async getUploadResultSummary(){

    const banner = this.page
      .locator('div')
      .filter({ hasText: /upload complete/i })
      .filter({ hasText: /\d+\s*\/\s*\d+\s*(created|updated)/i })
      .last();

    const readChip = async (label: 'created' | 'updated' | 'failed') => {

      const chip = banner
        .locator('span')
        .filter({ hasText: new RegExp(`\\/\\s*\\d+\\s*${label}`, 'i') })
        .first();

      if (!(await chip.count())) return null;

      const text = (await chip.innerText()).replace(/\s+/g, ' ').trim();

      const match = text.match(new RegExp(`(\\d+)\\s*\\/\\s*(\\d+)\\s*${label}`, 'i'));

      return match ? { count: Number(match[1]), total: Number(match[2]) } : null;

    };

    const created = await readChip('created');
    const updated = await readChip('updated');
    const failed = await readChip('failed');

    const created_count = created?.count ?? 0;
    const updated_count = updated?.count ?? 0;
    const failed_count = failed?.count ?? 0;

    return {
      total: created?.total ?? updated?.total ?? failed?.total ?? 0,
      created: created_count,
      updated: updated_count,
      failed: failed_count,
      passed: created_count + updated_count,
    };

  }


}
