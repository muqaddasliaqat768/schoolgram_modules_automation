//Instead of using console.log() directly everywhere, centralize it. (Login only)

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