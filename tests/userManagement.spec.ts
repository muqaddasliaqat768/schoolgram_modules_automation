// ---------------------------------------------------------------------------
// User Management end-to-end specs.
//
// Independence: every test is self-contained. `beforeEach` re-navigates from
// the dashboard, and each test mints its own run-unique data with
// buildUniqueTestUser() / buildUniqueTestUserBatch(). Any test can therefore be
// run alone, e.g.  npx playwright test -g "Successfully bulk delete selected users"
// No test reads data created by another, so test.describe.serial() is NOT used
// (it would wrongly skip independent tests after the first failure). The suite
// still runs single-worker — see the comment in playwright.config.ts for why.
//
// Data flow per test:
//   - negative tests reuse the static `testUser` but never submit successfully;
//   - positive tests create their own users and (edit/delete, bulk-delete)
//     clean them up again.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

import { DashboardPage } from '../pages/DashboardPage';
import { UserManagementPage } from '../pages/UserManagementPage';

import {
  testUser,
  buildUniqueTestUser,
  buildUniqueTestUserBatch,
  buildProfileUpdate,
  invalidEmails,
  invalidPasswords,
  invalidUsername,
  SAMPLE_CSV_USERNAMES
} from '../test-data/userData';
import { VALIDATION_MESSAGES, ROUTES } from '../utils/constants';


test.describe('User Management Negative Tests',()=>{


let dashboardPage: DashboardPage;
let userManagementPage: UserManagementPage;



// Fresh page objects + the full nav chain (dashboard -> expand sidebar -> open
// User Management) before EVERY test. This is what makes each test runnable in
// isolation: no test depends on where a previous one left the browser.
//
// NOTE: a direct page.goto() to the plugin's SPA route was tried as a speed-up
// and REVERTED — Moodle's require_login() hard-redirects that route to /login
// whenever the shared-account session is slightly stale, so it forced a ~1.5s
// re-auth before nearly every test and ended up SLOWER than loading /my/, which
// tolerates the stale session. Keep the dashboard walk.
test.beforeEach(async({page})=>{

dashboardPage =
new DashboardPage(page);


userManagementPage =
new UserManagementPage(page);


await dashboardPage.goto();

await dashboardPage.openSidebar();

await userManagementPage.open();


});



// --- Negative tests -------------------------------------------------------
// These open the Create User form and submit bad input. None of them creates a
// real user: client-side validation blocks every submit, so the shared static
// `testUser` fixture never reaches the database and cannot collide with a later
// run.



test('should show required field validations',async()=>{


await userManagementPage.openCreateUser();


// Submit the empty form; the app should surface one error per required field.
await userManagementPage.submit();


await expect(
userManagementPage.page.getByText(
VALIDATION_MESSAGES.FIRST_NAME_REQUIRED
)
).toBeVisible();


await expect(
userManagementPage.page.getByText(
VALIDATION_MESSAGES.LAST_NAME_REQUIRED
)
).toBeVisible();


await expect(
userManagementPage.page.getByText(
VALIDATION_MESSAGES.USERNAME_REQUIRED
)
).toBeVisible();


});




test('should validate username format',async()=>{


await userManagementPage.openCreateUser();


// Every field valid except the username (uppercase -> not allowed by Moodle).
await userManagementPage.fillRequiredFields(
{
...testUser,
username: invalidUsername
}
);


await userManagementPage.passwordInput.fill(
testUser.password
);


await userManagementPage.submit();



await expect(
userManagementPage.page.getByText(
VALIDATION_MESSAGES.INVALID_USERNAME
)
).toBeVisible();



});





test('should validate email format',async()=>{


await userManagementPage.openCreateUser();


// One step per bad email so a failure names the exact value that slipped through.
for(const email of invalidEmails){


await test.step(
`Verify invalid email ${email}`,
async()=>{


await userManagementPage.fillRequiredFields(
{
...testUser,
email
}
);


await userManagementPage.passwordInput.fill(
testUser.password
);


await userManagementPage.submit();



await expect(
userManagementPage.page.getByText(
VALIDATION_MESSAGES.INVALID_EMAIL
)
).toBeVisible();


});


}


});





test('should validate password format',async()=>{


await userManagementPage.openCreateUser();


// Each value breaks at least one Moodle password rule (length / digit / case /
// symbol); one step each so a failure points at the offending password.
for(const password of invalidPasswords){


await test.step(
`Verify invalid password ${password}`,
async()=>{


await userManagementPage.fillRequiredFields(
testUser
);


await userManagementPage.passwordInput.fill(
password
);


await userManagementPage.submit();



await expect(
userManagementPage.page.getByText(
/Password must contain/i
)
).toBeVisible();



});


}


});





// --- Positive / end-to-end tests ---------------------------------------------
// Each mints its own run-unique user(s) via the buildUnique* helpers and (where
// it makes sense) deletes them again, so the environment is left as it was found.

// Full happy path: create -> forced course-enrol redirect -> enrol -> back to
// list, ending with proof the new user is actually in the list.
test('Successfully create user, enroll in the course & redirect to the user list page',async()=>{


const newUser = buildUniqueTestUser();


await test.step(
'Create a new user and confirm the success modal',
async()=>{

await userManagementPage.createUser(newUser);

await userManagementPage.expectUserCreatedModal();

await userManagementPage.dismissModal();

}
);


await test.step(
'Land on the assign-course page for the new user',
async()=>{

await expect(
userManagementPage.page
).toHaveURL(ROUTES.COURSE_ENROL);

}
);


await test.step(
'Enroll the new user in a course from the available course list',
async()=>{

await userManagementPage.selectFirstCourseCategory();

await userManagementPage.enrollInFirstAvailableCourse();

}
);


await test.step(
'Navigate to the user list via the breadcrumb',
async()=>{

await userManagementPage.goToUsersListViaBreadcrumb();

await expect(
userManagementPage.page
).toHaveURL(ROUTES.USERS_LIST);

await expect(
userManagementPage.searchBox
).toBeVisible();

}
);


await test.step(
'The newly created user is actually present in the list',
async()=>{

// Assert the real side effect of "create user", not just that we navigated.
// narrowToUserRow() re-fires the search until exactly one matching row
// remains (or its budget runs out) — no fixed timeout papering over a late
// full-list response.
await userManagementPage.narrowToUserRow(newUser.username);

}
);


});




// Covers search -> edit-profile -> persistence -> delete. Asserts the real
// side effects: the list row shows the edited name, and the row is truly gone
// after delete (not just that a success modal appeared).
test('Search created user, edit profile, redirect back to list & delete it',async()=>{


const newUser = buildUniqueTestUser();

// Random new name + email so the post-edit assertions can't accidentally match
// the values the user was created with.
const updatedProfile = buildProfileUpdate();


await test.step(
'Create a user to work with and land on the users list',
async()=>{

await userManagementPage.createUser(newUser);

await userManagementPage.expectUserCreatedModal();

await userManagementPage.dismissModal();

await userManagementPage.goToUsersListViaBreadcrumb();

await expect(
userManagementPage.page
).toHaveURL(ROUTES.USERS_LIST);

}
);


await test.step(
'Search the new user and open it for editing',
async()=>{

await userManagementPage.editUser(newUser.username);

await expect(
userManagementPage.page
).toHaveURL(ROUTES.USER_PROFILE);

}
);


await test.step(
'Update the profile fields and confirm the success modal',
async()=>{

await userManagementPage.updateProfile(updatedProfile);

await userManagementPage.expectProfileUpdatedModal();

await userManagementPage.dismissModal();

}
);


await test.step(
'Go back to the user list via the Go Back button',
async()=>{

await userManagementPage.goBackToUsersList();

await expect(
userManagementPage.page
).toHaveURL(ROUTES.USERS_LIST);

}
)


await test.step(
'Verify the updated user is listed with the new details',
async()=>{

// Find by the immutable username, then assert the row now shows the edited
// name — proves the profile update persisted without leaning on the list's
// Email column (blank on some envs).
const row =
await userManagementPage.narrowToUserRow(newUser.username);

await expect(row).toContainText(updatedProfile.firstName);

await expect(row).toContainText(updatedProfile.lastName);

}
);


await test.step(
'Delete the user and confirm it is gone from the list',
async()=>{

// Identify by username: the list's Email column renders blank on some envs.
await userManagementPage.deleteUser(newUser.username);

await userManagementPage.expectDeleteConfirmModal();

await userManagementPage.confirmDeletion();

await userManagementPage.expectUserDeletedModal();

await userManagementPage.dismissModal();

await userManagementPage.expectUserGone(newUser.username);

}
);




});




// Ticks two rows, picks fields from every group in the Export dialog, then
// downloads and PARSES the CSV: asserts the chosen columns are present and the
// file contains exactly the two selected users.
test('Successfully export users CSV with selected fields',async()=>{


// Batch shares one run-unique token so a single search surfaces both rows in
// the same list view (row selection resets on every list refetch).
const { token, users } = buildUniqueTestUserBatch(2);


let selectedUsernames: string[] = [];


await test.step(
'Create two users to export',
async()=>{


for(const user of users){

await userManagementPage.createUser(user);

await userManagementPage.expectUserCreatedModal();

await userManagementPage.dismissModal();

await userManagementPage.goToUsersListViaBreadcrumb();

}


}
);


await test.step(
'Select both users and open the Export CSV modal',
async()=>{


await userManagementPage.searchUser(token);


// Tick exactly the two users this test created (by their known usernames),
// not "the first two rows" — no dependence on list order or column order.
selectedUsernames =
await userManagementPage.selectUsersByUsername(
users.map(u => u.username)
);


expect(selectedUsernames).toHaveLength(2);


await userManagementPage.openExportModal();


await expect(
userManagementPage.exportModal
).toBeVisible();


}
);


await test.step(
'Select fields across Account, Contact and Emergency Contact sections',
async()=>{


await userManagementPage.selectAccountInfoFields();


await userManagementPage.selectContactInfoFields();


await userManagementPage.selectEmergencyContactFields();


}
);


await test.step(
'Export and verify the downloaded CSV',
async()=>{


const download =
await userManagementPage.exportAndGetDownload();


expect(
download.suggestedFilename()
).toMatch(/^Users.*\.csv$/i);


// user_export_lib writes a UTF-8 BOM (Excel needs it for Arabic/Urdu data).
const csv =
(await fs.promises.readFile(await download.path(), 'utf8'))
.replace(/^\uFEFF/, '');


const rows = csv.trim().split(/\r?\n/);


const header =
rows[0].split(',').map(cell => cell.replace(/^"|"$/g, '').trim());


// Default columns plus one label from each selected group.
expect(header).toEqual(
expect.arrayContaining([
'Username',
'Email',
'Role',
'ID',
'National ID',
'Phone Number 1',
'Address',
'Emergency Contact Name',
'Emergency Contact Phone'
])
);


// Ticking rows sets the dialog scope to "selected" — exactly our two users.
expect(rows).toHaveLength(3);


for(const username of selectedUsernames){

expect(csv).toContain(username);

}


}
);


});




// Select 2 rows -> Bulk Delete -> confirm. Verifies BOTH users are actually
// gone from the list afterwards, not just that the success modal showed.
test('Successfully bulk delete selected users',async()=>{


// Two throwaway users sharing one token, so a single search surfaces both in
// the same list view (row selection resets on every list refetch).
const { token, users } = buildUniqueTestUserBatch(2);

let selectedUsernames: string[] = [];


await test.step(
'Create two users to bulk-delete',
async()=>{


for(const user of users){

await userManagementPage.createUser(user);

await userManagementPage.expectUserCreatedModal();

await userManagementPage.dismissModal();

await userManagementPage.goToUsersListViaBreadcrumb();

}


}
);


await test.step(
'Select both users and trigger Bulk Delete Users',
async()=>{


await userManagementPage.searchUser(token);


// Tick exactly the two users this test created (by their known usernames).
selectedUsernames =
await userManagementPage.selectUsersByUsername(
users.map(u => u.username)
);


expect(selectedUsernames).toHaveLength(2);


await userManagementPage.clickBulkDelete();


}
);


await test.step(
'Confirm the bulk-delete prompt',
async()=>{


await userManagementPage.expectBulkDeleteConfirmModal();


await userManagementPage.confirmBulkDeletion();


}
);


await test.step(
'Acknowledge the success modal',
async()=>{


await userManagementPage.expectBulkDeleteSuccessModal();


await userManagementPage.dismissModal();


}
);


await test.step(
'Verify both users are gone from the list',
async()=>{

// One search on the shared token (matches the whole batch) instead of one
// per user: the "no records" state only appears once BOTH are deleted.
await userManagementPage.expectUserGone(token);

}
);


});



// Two rejection paths on the bulk-upload page, back to back on the same page
// load: a 0-byte CSV and a CSV missing the required `username` column. Fixtures
// live in test-data/ and are intentionally static (they test the parser, not
// user creation).
test('Upload invalid file',async()=>{


await userManagementPage.goToUploadUsersPage();


// empty-user.csv is 0 bytes -> "CSV file is empty or invalid."
await userManagementPage.uploadFile(
path.join(
__dirname,
'../test-data/empty-user.csv'
)
);



await expect(
userManagementPage.page.getByText(
'CSV file is empty or invalid.'
)
).toBeVisible();




// missing-username.csv has a header but no `username` column.
await userManagementPage.uploadFile(
path.join(
__dirname,
'../test-data/missing-username.csv'
)
);



await expect(
userManagementPage.page.getByText(
'Missing required fields: username'
)
).toBeVisible();



});




// Full bulk-upload happy path: upload sample.csv -> pick "create + update" mode
// -> POLL the backgrounded adhoc job until it reports completion -> check the
// pass/fail tallies add up -> confirm a user from the CSV now exists in the list.
test('Successfully upload users via valid CSV file',async()=>{


await userManagementPage.goToUploadUsersPage();


await test.step(
'Choose sample.csv and load the preview table',
async()=>{


await userManagementPage.uploadCsvFile('sample.csv');


}
);


await test.step(
'Submit the upload and pick the create-and-update mode',
async()=>{


await userManagementPage.clickUploadUsers();


await expect(
userManagementPage.uploadModeDialog
).toBeVisible();


await userManagementPage.selectUploadMode('both');


}
);


await test.step(
'Poll Refresh until the background job reports completion',
async()=>{


await userManagementPage.refreshUploadStatus();


await userManagementPage.expectUploadComplete();


}
);


await test.step(
'Completion summary reports passed and failed row counts',
async()=>{


const summary =
await userManagementPage.getUploadResultSummary();


expect(summary.total).toBeGreaterThan(0);


expect(summary.passed).toBeGreaterThanOrEqual(1);


expect(summary.failed).toBeGreaterThanOrEqual(0);


expect(summary.passed + summary.failed).toBe(summary.total);


}
);


await test.step(
'A user from the CSV is now present in the users list',
async()=>{


await userManagementPage.goToUsersListViaBreadcrumb();


const [sampleUsername] = SAMPLE_CSV_USERNAMES;


// Re-fires the search until exactly the one CSV row is shown; no fixed
// timeout compensating for a slow/late list response.
await userManagementPage.narrowToUserRow(sampleUsername);


}
);


});


});