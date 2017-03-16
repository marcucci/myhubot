const AGM    = require('agilemanager-api');
let options  = {
  clientId: process.env.AGM_clientId,
  clientSecret: process.env.AGM_clientSecret,
  apiURL: process.env.AGM_apiUrl
};
let agm      = new AGM(options);
let agmLogin = new Promise(function(resolve, reject) {
  agm.login(function (err, body) {
    if (err) {
      console.log('Error on login');
      reject(err);
    } else {
      resolve(body);
    }
  });
});

module.exports = {
    agm: agm,
    agmLogin: agmLogin
}
