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
    let statusCode = 200;
    let payload = {};

    if(!protocol || !url || !method || !successCodes || !timeoutSeconds){
      statusCode = 400;
      payload = { 'Error': 'Missing required fields' };
      return reject({ statusCode, payload });
    }

    let token = typeof(data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token.trim() : false
    if(!token){
      statusCode = 400;
      payload = { 'Error': 'Invalid token' };
      return reject({ statusCode, payload });
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
        statusCode = 400;
        payload = { 'Error': `The user already has the maximum number of checks (${config.maxChecks}) ` };
        return reject({ statusCode, payload });
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

      return resolve({ statusCode, checkObject });
    } catch (error) {
      return reject(error);
    }
  })
}

// Check -- Get
// Required data: id
// Optional data: none
_checkHandlers.get = data => {
  return new Promise( async (resolve, reject) => {
    // Check the phone
    // Get request should get information from the query string instead of from the payload
    let statusCode = 200;
    let payload = {};
    try {
      let checkId = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
      if(!checkId) {
        statusCode = 400;
        payload = { 'Error': 'Missing required field'}
        return reject({ statusCode, payload });
      }

      // Lookup the check
      let dir = '';
      let errorObj = {};

      dir = 'checks';
      payload = { 'Error': 'Could not find the check id' };
      errorObj = helpers.setRejectedObj(400, payload);
      let checkData = await helpers.processPromise(_data.read, errorObj, [dir, checkId]);

      let token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
      let tokenIsValid = await tokenHandlers.verifyToken(token, checkData.userPhone);
      if(!tokenIsValid){
        statusCode = 403;
        return reject({ statusCode });
      }

      payload = checkData;
      return resolve({ statusCode, payload });
    } catch (error) {
      console.log(error);
      return reject(error);
    }
  })
}

// Check -- put
// Required data: id
// Optional data: protocol, url , method, successCodes, timeoutSeconds (one of them must be set)
_checkHandlers.put = data => {
  return new Promise( async (resolve, reject) => {
    // Check for the requried field
    let checkId = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;

    // Check for optional field
    let protocol = typeof(data.payload.protocol) == 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    let url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url : false;
    let method = typeof(data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    let successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes ? data.payload.successCodes : false;
    let timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;
    let statusCode = 200;
    let payload = {};

    // Error if the phone is invalid
    if(!checkId){
      statusCode = 400;
      payload = { 'Error': 'Missing required field' };
      return reject({ statusCode, payload });
    }

    if(!protocol && !url && !method && !successCodes && !timeoutSeconds){
      statusCode = 400;
      payload = { 'Error': 'Missing updated field' };
      return reject({ statusCode, payload });
    }

    try {
      let dir = '';
      let errorObj = {};

      dir = 'checks';
      payload = { 'Error': 'Could not find specified check' }
      errorObj = helpers.setRejectedObj(500, payload);
      let checkData = await helpers.processPromise(_data.read, errorObj, [dir, checkId]);

      let token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
      let tokenIsValid = await tokenHandlers.verifyToken(token, checkData.userPhone);
      if(!tokenIsValid){
        statusCode = 403;
        return reject({ statusCode });
      }

      if(protocol){
        checkData.protocol = protocol;
      }
      if(url){
        checkData.url = url;
      }
      if(method){
        checkData.method = method;
      }
      if(successCodes){
        checkData.successCodes = successCodes;
      }
      if(timeoutSeconds){
        checkData.timeoutSeconds = timeoutSeconds;
      }

      dir = 'checks';
      payload = { 'Error': 'Could not update the specified check' };
      errorObj = helpers.setRejectedObj(500, payload);
      await helpers.processPromise(_data.update, errorObj, [dir, checkId, checkData]);

      return resolve({ statusCode });
    } catch (error) {
      console.log(error);
      return reject(error);
    }
  })
}

// // Checks -- Delete
// // Requried data: id
// // Optional data: none
_checkHandlers.delete = data => {
  let statusCode = 200;
  let payload = {};
  return new Promise( async (resolve, reject) => {
    try {
      let checkId = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

      if(!checkId){
        statusCode = 400;
        payload = { 'Error': 'Missing required data' };
        return reject({ statusCode, payload });
      }

      let dir = '';
      let errorObj = {};

      dir = 'checks';
      payload = { 'Error': 'Could not find the specified check' }
      errorObj = helpers.setRejectedObj(400, payload);
      let checkData = await helpers.processPromise(_data.read, errorObj, [dir, checkId]);

      let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
      let isTokenValid = await tokenHandlers.verifyToken(token, checkData.userPhone);
      if(!isTokenValid){
        statusCode = 403;
        return reject({ statusCode });
      }

      dir = 'checks';
      payload = { 'Error': 'Could not delete the specified checks' };
      errorObj = helpers.setRejectedObj(500, payload);
      await helpers.processPromise(_data.delete, errorObj, [dir, checkId])

      dir = 'users';
      payload = { 'Error': 'Could not find user who created the check and could not delete the check from user object' };
      errorObj = helpers.setRejectedObj(500, payload);
      let userData = await helpers.processPromise(_data.read, errorObj, [dir, checkData.userPhone]);

      let userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
      let checkPosition = userChecks.indexOf(checkId)
      if(checkPosition < -1){
        statusCode = 500;
        payload = { 'Error': 'Could not find the checks in user\'s checks' };
        return reject({ statusCode, payload });
      }

      userChecks.splice(checkPosition, 1);
      userData.checks = userChecks;

      dir = 'users';
      payload = { 'Error': 'Could not update new user data after deleting the check' }
      errorObj = helpers.setRejectedObj(500, payload);
      await helpers.processPromise(_data.update, errorObj, [dir, userData.phone, userData]);

      return resolve({ statusCode });
    } catch (error) {
      console.log(error);
      return reject(error);
    }
  })
}
module.exports = _checkHandlers