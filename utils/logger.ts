// ---------------------------------------------------------------------------
// Tiny timestamped console logger.
//
// Used by the auth/setup flow so its progress + failure banners are easy to
// scan in CI output. Prefer this over bare console.log so every line is
// prefixed with a level and an ISO timestamp. (Test bodies should assert with
// `expect`, not log.)
// ---------------------------------------------------------------------------

function timestamp(){

return new Date()
.toISOString();

}


export default {


info(message:string){

console.log(
`[INFO] ${timestamp()} ${message}`
);

},


warn(message:string){

console.warn(
`[WARN] ${timestamp()} ${message}`
);

},


error(message:string){

console.error(
`[ERROR] ${timestamp()} ${message}`
);

}


};