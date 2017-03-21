const AGM    = require('agilemanager-api');
let options  = {
  clientId: process.env.AGM_clientId,
  clientSecret: process.env.AGM_clientSecret,
  apiURL: process.env.AGM_apiUrl
};
let agm      = new AGM(options);

function agmLogin (agm) {
  return new Promise(function(resolve, reject) {
    delete agm.token;
    agm.login(function (err, body) {
      if (err) {
        console.log('Error on login');
        reject(err);
      } else {
        console.log('AGM Logged in.');
        resolve(body);
      }
    });
  });
}

module.exports = {
    agm: agm,
    agmLogin: agmLogin
}
