const _data = require('./data.js');
const helpers = require('./helpers');
const config = require('./config');
const _userHandlers = require('./_handlers/_userHandlers');
const _tokenHandlers = require('./_handlers/_tokenHandlers');


// Define handlers
var handlers = {};

handlers.ping = function(data, callback) {
  callback(200);
};

handlers.notFound = function(data, callback) {
  callback(404);
};

handlers.users = async data => {
  var acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) <= -1) {
    let statusCode = 405;
    return { statusCode };
  }

  try {
    let result = await _userHandlers[data.method](data);
    return result;
  } catch (error) {
    return error;
  }
};


// Tokens
handlers.tokens = async data => {
  var acceptableMethods = ['post', 'get', 'put', 'delete'];

  if(acceptableMethods.indexOf(data.method) <= -1){
    let statusCode = 405;
    return { statusCode };
  }

  try {
    let result = await _tokenHandlers[data.method](data);
    return result;
  } catch (error) {
    return error;
  }
};

handlers.checks = function(data, callback){
  var acceptableMethods = ['post', 'get', 'put', 'delete'];

  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._checks[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Containers for all check methods
handlers._checks = {};

// Check -- Post
// Requried data: protocol, url, method, successcodes, timeoutSeconds
// Optional data: none

handlers._checks.post = function(data, callback){
  // Valides inputs
  let protocol = typeof(data.payload.protocol) == 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  let url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url : false;
  let method = typeof(data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  let successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes ? data.payload.successCodes : false;
  let timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

  if(!protocol || !url || !method || !successCodes || !timeoutSeconds){
    return callback(400, { 'Error': 'Missing required inputs or inputs are invalid' });
  }

  // Get token from headers
  let token = typeof(data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token.trim() : false

  if(!token){
    return callback(400, { 'Error': 'Invalid token'});
  }

  // Lookup user by reading the token
  _data.read('tokens', token, function(err, tokenData){
    if(err || !tokenData){
      // 403 unauthorized
      return callback(403);
    }

    let userPhone = tokenData.phone

    // Lookup user by reading user phone
    _data.read('users', userPhone, function(err, userData){
      if(err || !userData){
        return callback(403)
      }

      let userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

      // Verify if the user has less than the number fo max checks per user
      if(userChecks.length >= config.maxChecks){
        return callback(400, { 'Error': `The user already has the maximum number of checks (${config.maxChecks}) ` })
      }
      // Create reandom id for the check
      let checkId =  helpers.createRandomString(20);

      // Create the check object and includes user's phone
      let checkObject = {
        'id': checkId,
        'userPhone': userPhone,
        'protocol': protocol,
        'url': url,
        'method': method,
        'successCodes': successCodes,
        'timeoutSeconds': timeoutSeconds
      }

      // save it
      _data.create('checks', checkId, checkObject, function(err){
        if(err){
          return callback(500, { 'Errpr': 'Could not create the new check' });
        }

        // Add check id to users object
        userData.checks = userChecks;
        userData.checks.push(checkId);

        // save the new user data
        _data.update('users', userPhone, userData, function(err){
          if(err){
            return callabck(500, { 'Error': 'Could not update the user with the new check' });
          }
          return callback(200, checkObject);
        })
      })
    })
  })
}

// Check -- Get
// Required data: id
// Optional data: none
handlers._checks.get = function(data, callback) {
  // Check the phone
  // Get request should get information from the query string instead of from the payload

  let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if(!id) {
    return callback(400, { 'Error': 'Missing required field'});
  }

  // Lookup the check
  _data.read('checks', id, function(err, checkData){
    if(err || !checkData){
      return callback(404, { 'Error': 'Could not find the check id' });
    }

    let token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

    // Veryfy that the given token is valid and belongs to the user who create the check
    handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid){
      if(!tokenIsValid){
        return callback(403, { 'Error': 'Missing required token in header, or token is invalid' });
      }

      callback(200, checkData);
    })
  })
};


// Check -- put
// Required data: id
// Optional data: protocol, url , method, successCodes, timeoutSeconds (one of them must be set)
handlers._checks.put = function(data, callback){
  // Check for the requried field
  let id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;

  // Check for optional field
  let protocol = typeof(data.payload.protocol) == 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  let url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url : false;
  let method = typeof(data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  let successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes ? data.payload.successCodes : false;
  let timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

  // Error if the phone is invalid
  if(!id){
    return callback(400, { 'Error': 'Missing required field' });
  }

  if(!protocol && !url && !method && !successCodes && !timeoutSeconds){
    return callback(400, {'Error': 'Missing fields to update' });
  }

  _data.read('checks', id, function(err, checkData){
    if(err || !checkData){
      return callback(500, { 'Error': 'Could not find specified check' });
    }

    let token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

    handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid){
      if(!tokenIsValid){
        return callback(403);
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

      _data.update('checks', id, checkData, function(err){
        if(err){
          return callback(500, { 'Error': 'Could not update the specified check' });
        }
        callback(200);
      })
    })
  })
}

// Checks -- Delete
// Requried data: id
// Optional data: none
handlers._checks.delete = function(data, callback){
  let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

  if(!id){
    return callback(400, { 'Error': 'Missing required data' });
  }

  // Lookup the check that need to delete
  _data.read('checks', id, function(err, checkData){
    if(err || !checkData){
      return callback(400, { 'Error': 'Could not find the specified check' });
    }

    let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
    handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenisValid){
      if(!tokenisValid){
        return callback(400, { 'Error': 'Invalid token'});
      }
      _data.delete('checks', id, function(err){
        if(err){
          return callabck(500, { 'Error': 'Could not delete the specified checks' });
        }

        _data.read('users', checkData.userPhone, function(err, userData){
          if(err || !userData){
            return callback(500, { 'Error': 'Could not find user who created the check and could not delete the check from user object' });
          }
          let userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

          let checkPosition = userChecks.indexOf(id)
          if(checkPosition < -1){
            return callback(500, { 'Error': 'Could not find the checks in user\'s checks' });
          }

          userChecks.splice(checkPosition, 1);
          userData.checks = userChecks;

          // Save the user data again after removing the check
          _data.update('users', userData.phone, userData, function(err){
            err ? callback(500, { 'Error': 'Could not update new user data after deleting the check' }) : callback(200);
          })
        })
      })
    })
  })
}

module.exports = handlers;
