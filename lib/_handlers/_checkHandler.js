const _data = require('../data');
const helpers = require('../helpers');
const tokenHandlers = require('./_tokenHandlers');
const config = require('../config');

_checkHandlers = {};

// Check -- Post
// Requried data: protocol, url, method, successcodes, timeoutSeconds
// Optional data: none
_checkHandlers.post = data => {
  return new Promise( async (resolve, reject) => {
    let protocol = typeof(data.payload.protocol) == 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    let url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url : false;
    let method = typeof(data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    let successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes ? data.payload.successCodes : false;
    let timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;
    let statusCodes = 200;
    let payload = {};

    if(!protocol || !url || !method || !successCodes || !timeoutSeconds){
      statusCodes = 400;
      payload = { 'Error': 'Missing required fields' };
      return reject({ statusCodes, payload });
    }

    let token = typeof(data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token.trim() : false
    if(!token){
      statusCodes = 400;
      payload = { 'Error': 'Invalid token' };
      return reject({ statusCodes, payload });
    }

    try {
      let dir = '';
      let errorObj = helpers.setRejectedObj(403);
      dir = 'tokens';
      let tokenData = await helpers.processPromise(_data.read, errorObj, [dir, token] )

      let userPhone = tokenData.phone;
      dir = 'users';
      errorObj = helpers.setRejectedObj(403);
      let userData = await helpers.processPromise(_data.read, errorObj, [dir, userPhone])

      let userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
      if(userChecks.length >= config.maxChecks){
        statusCodes = 400;
        payload = { 'Error': `The user already has the maximum number of checks (${config.maxChecks}) ` };
        return reject({ statusCodes, payload });
      }

      let checkId = helpers.createRandomString(20);
      let checkObject = {
        'id': checkId,
        'userPhone': userPhone,
        'protocol': protocol,
        'url': url,
        'method': method,
        'successCodes': successCodes,
        'timeoutSeconds': timeoutSeconds
      }

      dir = 'checks';
      payload = { 'Errpr': 'Could not create the new check' };
      errorObj = helpers.setRejectedObj(500, payload)
      await helpers.processPromise(_data.create, errorObj, [dir, checkId, checkObject]);

      userData.checks = userChecks;
      userData.checks.push(checkId);

      dir = 'users';
      payload = { 'Error': 'Could not update the user with the new check' };
      errorObj = helpers.setRejectedObj(500, payload)
      await helpers.processPromise(_data.update, errorObj, [dir, userPhone, userData]);

      return resolve({ statusCodes, checkObject });
    } catch (error) {
      console.log(error);
      return reject(error);
    }
  })
}



module.exports = _checkHandlers