import * as path from 'path';
import { expect, Locator, Page, Response } from '@playwright/test';
import { MENU, ROUTES } from '../utils/constants';
import { User } from '../types/user';

/**
 * Retry budgets for the async-settling helpers in this file.
 *
 * These are NOT `page.waitForTimeout()` sleeps. They tune Playwright's
 * `expect.poll()` / `toPass()`, which re-check a REAL condition (a row count, a
 * "not found" message, a completion banner) on every tick and resolve the moment
 * it holds. `timeout` is only the give-up ceiling — reached only when the app
 * never reaches the expected state (a real bug); `intervals` is the gap between
 * checks. They are deliberately gentle where each retry issues its own network
 * request, so a slow environment is not flooded. Removing them is not a
 * hardening: `expect.poll` would fall back to a 5s ceiling (far too short for a
 * background job) and `toPass` to no ceiling at all, both polling every 100ms.
 * Tune the suite's patience HERE, in one place.
 */
const POLL = {
  // Row-count stability — cheap DOM-only reads, so a tight cadence is fine.
  LIST_SETTLE: { timeout: 15_000, intervals: [200] },

  // narrowToUserRow: each retry re-runs a full search (~2 requests), so back off.
  NARROW_ROW: { timeout: 45_000, intervals: [1_000, 2_000, 3_000, 5_000] },
  // …and the per-attempt "is the row there yet" check inside that retry.
  NARROW_ROW_ATTEMPT_MS: 5_000,

  // expectUserGone: each retry re-searches (1 request) while an async delete lands.
  USER_GONE: { timeout: 30_000, intervals: [1_000, 2_000, 3_000] },

  // refreshUploadStatus: a backgrounded Moodle adhoc task — minutes, not seconds.
  // Each retry clicks "Refresh" (1 request), so poll slowly.
  UPLOAD_JOB: { timeout: 180_000, intervals: [3_000] },
};

/**
 * Page object for the User Management area (users list, create user, edit
 * profile, course enrol, CSV export, bulk delete, CSV upload).
 *
 * Locator strategy, in order of preference:
 *   1. getByRole / getByLabel / getByText / getByPlaceholder  (used everywhere
 *      the app exposes an accessible name).
 *   2. Deterministic ids the app DOES provide, e.g. `#export-field-{key}`.
 *   3. A CSS/text fallback ONLY where the app gives us nothing else — the
 *      SweetAlert2 popups (`.swal2-*`), react-select / MUI widget internals,
 *      the theme's `#custom-loader-wrapper` overlay, and the row action icons
 *      (rendered as bare <span>s with no role/name/testid — see
 *      local/useraccountmanager/.../ActionButton.jsx). Each such locator has a
 *      comment explaining why nothing better exists; if the app ever adds
 *      data-testid to those spans, switch to it here.
 */
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

  // Profile edit form: fields carry no <label> association, only placeholders.
  readonly profileFirstNameInput: Locator;
  readonly profileLastNameInput: Locator;
  readonly profileEmailInput: Locator;

  readonly successModal: Locator;
  readonly modalOkButton: Locator;

  // Users List CSV export: the trigger button and the MUI dialog it opens.
  readonly exportCsvButton: Locator;
  readonly exportModal: Locator;
  readonly exportModalExportButton: Locator;

  // Users List bulk delete: the toolbar button (disabled until 2+ rows ticked).
  readonly bulkDeleteButton: Locator;

  // Upload Users page (upload-users/). "Choose File" only proxies clicks to a
  // hidden <input type=file>; the CSV is set on the input directly.
  readonly chooseFileButton: Locator;
  readonly uploadUsersSubmitButton: Locator;
  readonly uploadModeDialog: Locator;
  readonly uploadRefreshButton: Locator;
  readonly uploadCompleteBanner: Locator;
  readonly uploadPreviewFooter: Locator;

  // Theme-level full-screen overlay (theme/space/js/custom.js) shown via a jQuery
  // fadeIn/fadeOut on every navigation. Mid-fade it still covers the page with
  // z-index 99999 and eats pointer events, so a click fired before the fade-out
  // finishes hits the overlay instead of the button. A warm cache / slower
  // interactive run happens to clear it in time; a cold headless run does not —
  // hence the "fails when not run through the CLI" flakiness.
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


    // Course enrol page (reached after creating a student user). The page
    // renders multiple ".react-select-container" widgets (category picker,
    // "Add to cohort" …), so scope to the one holding the category label.
    this.courseCategorySelect =
      page
        .locator('.react-select-container')
        .filter({ hasText: 'Course Category' });


    // The enrol page renders two identical selector cards; the first
    // ".course-list-container" is "Available Courses", the second is
    // "Enrolled Courses".
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


    // User profile page, reached from the users-list pencil action.
    this.editProfileButton =
      page.getByRole('button',{
        name:'Edit Profile'
      });


    // "Update" alone would also match the "Update role in Courses" prompt.
    this.updateProfileButton =
      page.getByRole('button',{
        name:'Update',
        exact:true
      });


    this.goBackButton =
      page.getByRole('button',{
        name:'Go Back'
      });


    // Exact match: getByPlaceholder is a case-insensitive substring match by
    // default, so 'e.g., John' also matches the username ('e.g., john_doe') and
    // email ('e.g., john.doe@mail.com') placeholders.
    this.profileFirstNameInput =
      page.getByPlaceholder('e.g., John', { exact: true });

    this.profileLastNameInput =
      page.getByPlaceholder('e.g., Doe', { exact: true });

    this.profileEmailInput =
      page.getByPlaceholder('e.g., john.doe@mail.com', { exact: true });


    // Create/enrol feedback is a SweetAlert2 popup that overlays the next page
    // and swallows pointer events until its OK button dismisses it.
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


    // MUI Dialog: the Paper element carries role="dialog"; filter by the title so
    // it can never latch onto another dialog that happens to be mounted.
    this.exportModal =
      page.getByRole('dialog')
        .filter({ hasText: 'Export Users' });


    // Inside the dialog "Export" is unambiguous (siblings are "Cancel" and the
    // field-group chevrons); exact keeps it off the page's own "Export CSV".
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


    // exact keeps it off the users-list "Upload Users (csv)" button; the
    // FloatingButton renders the label twice (inline + floating), so callers
    // take .first().
    this.uploadUsersSubmitButton =
      page.getByRole('button',{
        name:'Upload Users',
        exact:true
      });


    // The "Please select upload type" SweetAlert2 shown after Upload Users.
    this.uploadModeDialog =
      page.locator('.swal2-popup')
        .filter({ hasText: 'Please select upload type' });


    // Only rendered while the bulk job is pending/running (ProgressCard); it
    // disappears once the CompletedBanner takes over.
    this.uploadRefreshButton =
      page.getByRole('button',{
        name:'Refresh'
      });


    // CompletedBanner label. DOM text is "Upload complete"; CSS upper-cases it.
    this.uploadCompleteBanner =
      page.getByText(/upload complete/i);


    // The preview is a virtualized ARIA table (role=table, no <tr>); its footer
    // "N users loaded" is the reliable "CSV parsed" signal.
    this.uploadPreviewFooter =
      page.getByText(/\d+ users loaded/i);

  }


  // Wait out the theme's navigation overlay before any click that follows a page
  // transition. fadeOut ends on `display:none`, so once settled the element is
  // "hidden"; if it was never rendered this resolves immediately.
  async waitForLoaderGone(){

    await expect(this.customLoader).toBeHidden({ timeout: 15000 });

  }


  // A SweetAlert2 popup narrowed to the one carrying `text`. The delete flow
  // fires two popups back to back (confirm → success) and SweetAlert2 keeps the
  // outgoing one in the DOM through its ~150ms close animation, so a bare
  // `.swal2-popup` locator intermittently resolves to two nodes and every
  // assertion on it throws a strict-mode error. Filtering by text picks the
  // right one regardless of the overlap.
  swalPopup(text: string | RegExp): Locator {

    return this.page
      .locator('.swal2-popup')
      .filter({ hasText: text });

  }


  // Entry via the UI: Dashboard sidebar -> "User Management" link. Bookends the
  // click with waitForLoaderGone() so a following action doesn't race the theme's
  // navigation overlay. (A direct page.goto() to the SPA route is faster on paper
  // but Moodle bounces it to /login on a stale shared session — see the note in
  // userManagement.spec.ts beforeEach.)
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
      // App copy misspells "successfully" ("succesfully") — tolerate both.
      /User created succes?sfully!?/i
    );

  }


  async dismissModal(){

    // A list refetch (e.g. after a delete) can raise the theme overlay — z-index
    // 99999, above the swal popup — right over the OK button. Wait it out.
    await this.waitForLoaderGone();

    await this.modalOkButton.click();

    // toHaveCount(0) rather than toBeHidden(): SweetAlert2 detaches the popup on
    // close, and count is safe even if a closing popup is briefly still present.
    await expect(this.successModal).toHaveCount(0, { timeout: 15000 });

  }


  // Admins must pick a category before any course is listed.
  async selectFirstCourseCategory(){

    // Reached by a redirect from the create-user success modal — the overlay
    // fades over this page too.
    await this.waitForLoaderGone();

    // The enrol page is a React bundle that mounts after the redirect; polling
    // isVisible() immediately (as this used to) returned false before the app
    // rendered and the method bailed without picking a category, leaving
    // "Available Courses" empty and failing the next step. Wait for the widget.
    await expect(this.courseCategorySelect).toBeVisible({ timeout: 30000 });

    await this.courseCategorySelect.click();

    const firstOption =
      this.page.getByRole('option').first();

    await expect(firstOption).toBeVisible();

    await firstOption.click();

    // react-select shows a loading spinner while the category's courses fetch;
    // wait for that to settle so the caller doesn't read a stale empty list.
    await this.waitForLoaderGone();

  }


  // Selects the first available course, enrols the user, and waits for the
  // course to move into the "Enrolled Courses" list. Returns the course label.
  async enrollInFirstAvailableCourse(){

    const firstCourse =
      this.availableCoursesList
        .locator('p')
        .first();

    // The list is populated by a fetch fired on category select — give it more
    // room than the default expect timeout on a cold run.
    await expect(firstCourse).toBeVisible({ timeout: 30000 });

    const courseLabel =
      (await firstCourse.textContent())?.trim() ?? '';

    await firstCourse.click();

    await this.enrollButton.click();

    // On success the course leaves "Available Courses" and shows under
    // "Enrolled Courses".
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


  // From the users list, open the bulk CSV upload page via its toolbar button
  // (keeps the app route out of the specs).
  async goToUploadUsersPage(){

    await this.waitForLoaderGone();

    await this.uploadButton.click();

    await this.page.waitForURL(ROUTES.UPLOAD_USERS);

    await this.waitForLoaderGone();

  }


  // A users-list <tr> matched by any unique cell text (username or email).
  // The header row never contains it, so it is excluded automatically.
  userRow(identifier: string): Locator {

    return this.page
      .getByRole('row')
      .filter({ hasText: identifier });

  }


  // Every DATA row of the users list (the <thead> row is excluded). The list
  // renders exactly one <table class="table"> with a <tbody> (UsersTable.jsx),
  // so scoping by the semantic <tbody> + role=row is stable without depending
  // on the `.table` CSS class.
  get dataRows(): Locator {

    return this.page.locator('tbody').getByRole('row');

  }


  // A get_users response whose `search` param matches `term`. searchParams
  // decodes %40 back to '@', so compare on the pre-'@' prefix the client
  // actually sends (mirrors searchUser()'s marker logic).
  private isFilteredGetUsers(res: Response, term: string): boolean {

    if (!res.url().includes('action=get_users') || !res.ok()) return false;

    const value = new URL(res.url()).searchParams.get('search') ?? '';

    return value.split('@')[0] === term;

  }


  // waitForResponse resolves the instant the HTTP response arrives — before
  // React has re-rendered the table from it, and while a slower earlier
  // get_users (the unfiltered list load from the navigation that landed us here)
  // may still be in flight and would replace the rows if it lands next. Block
  // until the row count holds steady across consecutive samples so callers never
  // read a mid-transition list.
  async waitForListSettled(){

    const rows = this.dataRows;

    // Poll the row count until it repeats on three consecutive samples.
    // expect.poll drives the cadence (POLL.LIST_SETTLE.intervals), so there is no
    // raw page.waitForTimeout here. `stable` is closed over across polls; a
    // changing count resets it. `.catch()` keeps a never-settling list from
    // failing the caller outright — a genuinely wrong list is caught by the
    // assertion that follows every call site.
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


  // Drives the users-list search so it ALWAYS issues a fresh query for
  // `identifier`. The box is a debounced controlled input (useDebounce(text, 500)
  // in UsersList.jsx) whose fetch effect only re-runs when `debouncedSearchText`
  // *changes* — so re-typing the same value (as a retry loop does) fires no
  // request at all. Committing an empty search first guarantees the value
  // transitions; every response wait is registered BEFORE the keystroke that
  // triggers it (a fast env can answer before a post-fill listener attaches),
  // and each fill is followed by waitForListSettled() so a slow full-list fetch
  // can't land last and clobber the filtered result.
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


  // Filter the list down to exactly the target row. A single search + assert is
  // racy (a late full-list response can clobber the filtered result even after
  // fireUserSearch's settle), so wrap the whole fire-then-count in toPass(): on a
  // miss it re-fires — fireUserSearch forces a real refetch each call — until
  // exactly the target row remains or the budget runs out.
  async narrowToUserRow(identifier: string): Promise<Locator>{

    const row = this.userRow(identifier);

    await expect(async () => {

      await this.fireUserSearch(identifier);

      await expect(row).toHaveCount(1, { timeout: POLL.NARROW_ROW_ATTEMPT_MS });

    }).toPass(POLL.NARROW_ROW);

    return row;

  }


  async searchUser(identifier: string){

    // NOT fill('') first: clearing then re-typing fires a second, empty-search
    // debounced refetch that can land *after* the real one and leave the list
    // showing every user (the flake behind "row resolved to 0 elements").
    await this.searchBox.fill(identifier);

    // Wait for the response that actually carries THIS term, not just any
    // `search=` request. The part before "@" is encoding-stable, so it survives
    // whatever the client does to the querystring.
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


  // Opens the user's profile from the list and switches it into edit mode.
  async editUser(identifier: string){

    const row = await this.narrowToUserRow(identifier);

    // Open the profile via the user's name link (role=link) rather than the
    // pencil <span> — the name link points at the same /user-profile route and,
    // unlike the icon, has an accessible name. It is the row's only link.
    await row.getByRole('link').first().click();

    await this.page.waitForURL(ROUTES.USER_PROFILE);

    // Guard against opening the wrong profile: the fetched user must match.
    await expect(
      this.page.getByText(identifier).first()
    ).toBeVisible();

    await this.editProfileButton.click();

    // Edit mode is active once the editable fields render.
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
      // App copy misspells "successfully" ("succesfully") — tolerate both.
      /User updated succes?sfully!?/i
    );

  }


  async goBackToUsersList(){

    await this.goBackButton.click();

  }


  // Clicks the row's delete icon; the app then raises the confirm modal.
  async deleteUser(identifier: string){

    await this.waitForLoaderGone();

    // Fast path: a prior step (e.g. "verify updated") often leaves the list
    // already filtered to exactly this user — skip the extra search cycle then.
    // Otherwise narrow to it. Either way we click only once exactly one row matches.
    const row = this.userRow(identifier);

    if ((await row.count()) !== 1){
      await this.narrowToUserRow(identifier);
    }

    // The delete control is a bare <span class="actionBtn…"> with no role, no
    // accessible name and no testid (local/useraccountmanager/.../ActionButton.jsx),
    // and — unlike edit — it has no link equivalent. Within a row there are
    // exactly two such spans in DOM order: [0] edit (pencil), [1] delete.
    // If the app adds data-testid to ActionButton, switch this to getByTestId.
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

    // Scope the click to the confirm popup: as the success popup fades in, a bare
    // .swal2-confirm can match both popups' buttons at once.
    await confirmPopup.locator('.swal2-confirm').click();

    // Let the confirm popup finish closing before the caller looks for the
    // success popup — otherwise expectUserDeletedModal() can latch onto this
    // still-present popup (no "deleted" text) or hit two popups at once.
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


  // Field checkboxes carry deterministic ids (`export-field-{key}`) mirroring
  // classes/user_export_lib.php::FIELD_GROUPS. check() is a no-op for the four
  // fields ticked by default (fullname, username, email, role).
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


  // Clicks the dialog's Export button and resolves with the browser download it
  // triggers. download.php streams the CSV via a Content-Disposition header into a
  // hidden iframe, which Chromium still surfaces as a page 'download' event.
  async exportAndGetDownload(){

    const downloadPromise =
      this.page.waitForEvent('download', { timeout: 30000 });

    await this.exportModalExportButton.click();

    return downloadPromise;

  }


  // Ticks the selection checkbox on the row for each supplied username. Selecting
  // by the caller's own known usernames (rather than "the first N rows") means
  // the test controls exactly which users it operates on — no dependence on
  // column order or list ordering. Bulk Delete needs 2+ rows selected before its
  // button enables. Returns the same usernames for convenient chaining.
  //
  // Row checkboxes reset on every list refetch, so ALL selections must land in
  // one stable view. The caller has already searched a run-unique token that
  // matches exactly these users, so we first wait for the filtered list to hold
  // exactly `usernames.length` rows — a real "list settled on the expected
  // result" condition. toHaveCount polls, so a late full-list response that
  // briefly clobbers the filter is ridden out rather than papered over.
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

    // Scope the click to the confirm popup: as the success popup fades in, a bare
    // .swal2-confirm can match both popups' buttons at once. Mirrors confirmDeletion().
    await confirmPopup.locator('.swal2-confirm').click();

    await expect(confirmPopup).toHaveCount(0, { timeout: 15000 });

  }


  async expectBulkDeleteSuccessModal(){

    await expect(
      this.swalPopup(/Users deleted/i)
    ).toBeVisible({ timeout: 15000 });

  }


  // Bulk delete fires its per-user DELETE calls without awaiting them, so a row
  // can outlive the success modal by a moment. Re-search until the empty state
  // shows (or fail loudly once the budget runs out).
  async expectUserGone(identifier: string){

    // fireUserSearch (not searchUser): the poll needs each retry to actually
    // re-query, which re-typing an unchanged value into the debounced box won't.
    // POLL.USER_GONE gives it a real ceiling — the default is 5s, too short for
    // an async delete to propagate on a remote env.
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


  // Sets a CSV from automation-tests/test-data/ on the upload page's hidden file
  // input, then waits for FileUpload to parse it — the "Upload Users" button is
  // inert until the preview (and its "N users loaded" footer) has rendered.
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


  // mode → the three buttons in the "Please select upload type" dialog.
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


  // The upload runs as a backgrounded adhoc task; the page only re-checks the job
  // when Refresh is clicked, and Refresh is only rendered while the job is still
  // pending/running. Poll it until the completion banner shows or the
  // POLL.UPLOAD_JOB ceiling elapses, then clear the SweetAlert2 summary that a
  // completion pops over the page so the banner underneath is unobstructed for
  // later assertions.
  async refreshUploadStatus(){

    // Poll: click Refresh while it is still rendered (job running), settle once
    // the completion banner appears. Refresh only exists during pending/running,
    // so its disappearance is itself a done signal.
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

    // A completion also pops a SweetAlert2 summary over the page — clear it so
    // the banner underneath is unobstructed for the assertions that follow.
    if (await this.successModal.isVisible().catch(() => false)){
      await this.modalOkButton.first().click().catch(() => undefined);
      await expect(this.successModal).toHaveCount(0, { timeout: 10000 }).catch(() => undefined);
    }

  }


  async expectUploadComplete(){

    await expect(this.uploadCompleteBanner).toBeVisible({ timeout: 10000 });

  }


  // Parses the completion banner's chips: "{count} / {total} created|updated|failed".
  // The failed chip is only rendered when there are failures, so it defaults to 0.
  // `passed` = created + updated.
  async getUploadResultSummary(){

    // Scope to the completion banner so the chip text-shape match can't latch
    // onto anything else on the page. The banner is the innermost element that
    // holds BOTH the "Upload complete" label and a "N / M created|updated" chip;
    // `.last()` of the two text filters resolves to it without an xpath parent
    // hop or a CSS class.
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