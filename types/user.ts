// Shape of a test user fixture (see test-data/userData.ts). `password` is the
// value used for disposable users the tests create — it is NOT the admin login
// password, which lives in .env.test.

export interface User {

 firstName:string;

 lastName:string;

 username:string;

 email:string;

 password:string;

}