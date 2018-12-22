const _data = require('./data.js');
const helpers = require('./helpers');
const config = require('./config');

// Define handlers
var handlers = {};

handlers.ping = function(data, callback) {
  callback(200);
};

handlers.notFound = function(data, callback) {
  callback(404);
};

handlers.users = function(data, callback) {
  var acceptableMethods = ['post', 'get', 'put', 'delete'];

  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for the users submethods
// Required data: firstNanme, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users = {};

handlers._users.post = function(data, callback) {
  // Check for required field
  let firstName = typeof data.payload.firstName == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  let lastName = typeof data.payload.lastName == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  let phone = typeof data.payload.phone == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  let password = typeof data.payload.password == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  let tosAgreement = typeof data.payload.tosAgreement == 'boolean' && data.payload.tosAgreement == true ? true : false;

  if (firstName && lastName && phone && password && tosAgreement) {
    // Makue sure that the user does not already exist
    _data.read('users', phone, function(err, data) {
      if (err) {
        // Hash the password
        let hashedPassword = helpers.hash(password);

        if (!hashedPassword)
          return callback(500, { Error: "Could not hash the user's password" });

        // Create user object
        let userObjuect = {
          firstName: firstName,
          lastName: lastName,
          phone: phone,
          hashedPassword: hashedPassword,
          tosAgreement: true
        };

        // Stroe the user
        _data.create('users', phone, userObjuect, function(err) {
          if (err) {
            console.log(err);
            return callback(500, { Error: 'Could not create the user' });
          }
          callback(200);
        });
      } else {
        callback(400, {
          Error: 'A user with that phone number already exists.'
        });
      }
    });
  } else {
    callback(400, { Error: 'Missing required fields' });
  }
};

// Users - get
// Required data: phone
// Optional data: none
// Only authanticated user to access their own data. Do not let them to access other user's data
handlers._users.get = function(data, callback) {
  // Check the phone
  // Get request should get information from the query string instead of from the payload

  let phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
  if(!phone) {
    return callback(400, { 'Error': 'Missing required field'});
  }

  let token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

  handlers._tokens.verifyToken(token, phone, function(tokenIsValid){
    if(!tokenIsValid){
      return callback(403, { 'Error': 'Missing required token in header, or token is invalid' });
    }

    _data.read('users', phone, function(err, data){
      if(!err && data){
        // Remove the hashed password from the user object before returning the user object back to user

        delete data.hashedPassword;
        callback(200, data);
      } else {
        callback(404);
      }
    })
  })
};

// Required data: phone
// Optional data : firstName, lastName , password (at least one must be specified)
// Only authanticated user to access their own data. Do not let them to access other user's data
handlers._users.put = function(data, callback) {
  // Check for the requried field
  let phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  let firstName = typeof data.payload.firstName == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  let lastName = typeof data.payload.lastName == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  let password = typeof data.payload.password == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

  // Error if the phone is invalid
  if(!phone){
    return callback(400, { 'Error': 'Missing required field' });
  }

  if(!firstName && !lastName && !password){
    return callback(400, {'Error': 'Missing fields to update' });
  }

  let token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

  handlers._tokens.verifyToken(token, phone, function(tokenIsValid){
    if(!tokenIsValid){
      return callback(403, { 'Error': 'Missing required token in header, or token is invalid' });
    }

    _data.read('users', phone, function(err, userData){
      if(!err && userData){
        if(firstName){
          userData.firstName = firstName;
        }

        if(lastName){
          userData.lastName = lastName;
        }

        if(password){
          userData.hashedPassword = helpers.hash(password);
        }

        // Stroe new update
        _data.update('users', phone, userData, function(err){
          if(err){
            console.log(err);

            // 500 instead of 400 means nothoing wrong with the user request. It is an error on the server.
            return callback(500, { 'Error': 'Could not update the user' });
          }
          callback(200);
        })

      } else {
        callback(400, { 'Error': 'The specified user does not exist' });
      }
    })
  })
};

// Only authanticated user should delete their object only
// Required field phone
// Cleanup (delete) any other data files associated with this user
handlers._users.delete = function(data, callback) {
  // Check if the phone is valid
  let phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
  if(!phone) {
    return callback(400, { 'Error': 'Missing required field'});
  }

  let token = typeof(data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token.trim() : false

  handlers._tokens.verifyToken(token, phone, function(tokenIsValid){
    if(!tokenIsValid){
      return callback(403, { 'Error': 'Missing required token in header, or token is invalid' });
    }
    _data.read('users', phone, function(err, userData){
      if(!err && userData){
        _data.delete('users', phone, function(err){
          if(err){
            return callback(500, { 'Error': 'Could not delete the specified user' })
          }
          // Delete all other information associate with the user
          let userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
          let numberOfChecksToDelete = userChecks.length;
          if(numberOfChecksToDelete >0){
            let checksDeleted = 0 ;
            let deletionError = false;

            // Loop through the checks
            userChecks.forEach(function(checkId){

              // Delete check
              _data.delete('checks', checkId, function(err){
                if(err){
                  deletionError = true;
                }
                checksDeleted++;
                if(checksDeleted = numberOfChecksToDelete){
                  if(!deletionError){
                    callback(200);
                  } else {
                    callback(500, { 'Error': 'Error encountered while attempting to delete all of the user\'s checks. All checks might not be successfully deleted' });
                  }
                }
              })
            })
          } else{
            callback(200);
          }
        })
      } else {
        callback(400, { 'Error': 'Could not find the specified user' });
      }
    })
  })
};


// Tokens
handlers.tokens = function(data, callback) {
  var acceptableMethods = ['post', 'get', 'put', 'delete'];

  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers.tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Token submethods
handlers._tokens = {};


// Required data : phone, passwored
// Optional
handlers.tokens.post = function(data, callback){
  let phone = typeof data.payload.phone == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  let password = typeof data.payload.password == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

  if(!phone || !password){
    return callback(400, { 'Error': 'Missing required fields' });
  }

  _data.read('users', phone, function(err, userData){
    if(err || !userData){
      return callback(400, {'Error': 'Could not fined the specified user' });
    }

    // Hash the sent password, and compared it to the password stor it to the user object
    let hashedPassword = helpers.hash(password);
    if( hashedPassword !== userData.hashedPassword){
      return callback(400, { 'Error': 'Password did not match the specified users password' })
    }

    // Set token to one hour
    let tokenId = helpers.createRandomString(20);
    let expires = Date.now() + 1000 * 60 * 60;
    let tokenObject = {
      'phone': phone,
      'id': tokenId,
      'expires': expires
    };

    // Store the token
    _data.create('tokens', tokenId, tokenObject, function(err){
      if(err){
        return callback(500, { 'Error': 'Could not create the new token' });
      }
      callback(200, tokenObject);
    })
  })
}

// Required data: token ID
handlers.tokens.get = function(data, callback){
  let tokenId = typeof(data.queryStringObject.tokenId) == 'string' && data.queryStringObject.tokenId.trim().length == 20 ? data.queryStringObject.tokenId.trim() : false;
  if(!tokenId) {
    return callback(400, { 'Error': 'Missing required field'});
  }

  _data.read('tokens', tokenId, function(err, tokenData){
    if(!err && tokenData){
      callback(200, tokenData);
    } else {
      callback(404);
    }
  })
}

// Required data : id, extend
handlers.tokens.put = function(data, callback){
  let tokenId = typeof(data.payload.tokenId) == 'string' && data.payload.tokenId.trim().length == 20 ? data.payload.tokenId.trim() : false;
  let extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend === true ? data.payload.extend : false;

  if(!tokenId || !extend ){
    return callback(400, { 'Error': 'Missing required fields or fields invalid' });
  }

  _data.read('tokens', tokenId, function(err, tokenData){
    if(err || !tokenData){
      return callback(400, { 'Error': 'Specified token does no exist' });
    }
    // Check to make sure the tken isn't already expried\
    if(tokenData.expires <= Date.now()){
      return callback(400, { 'Error': 'The token is already expired, it can not be extended' });
    }

    tokenData.expires = Date.now() + 1000 * 60 *60;

    _data.update('tokens', tokenId, tokenData, function(err){
      err ? callback(500, { 'Error': 'Could not update the token\' expiration'}) : callback(200);
    })

  })
}


handlers.tokens.delete = function(data, callback){
  // Check if the token ID is valid
  let tokenId = typeof(data.payload.tokenId) == 'string' && data.payload.tokenId.trim().length == 20 ? data.payload.tokenId.trim() : false;
  if(!tokenId) {
    return callback(400, { 'Error': 'Missing required field'});
  }

  _data.read('tokens', tokenId, function(err, data){
    if(!err && data){
      _data.delete('tokens', tokenId, function(err){
        if(err){
          return callback(500, { 'Error': 'Could not delete the specified token' })
        }
        callback(200);
      })
    } else {
      callback(400, { 'Error': 'Could not find the specified token' });
    }
  })
}


// Verify if a given token id is current valid for a given user
handlers._tokens.verifyToken = function(tokenId, phone, callback){
  // Lookup the token
  _data.read('tokens', tokenId, function(err, tokenData){
    if(err || !tokenData){
      return callback(false);
    }

    if(tokenData.phone === phone && tokenData.expires > Date.now()){
      callback(true)
    } else {
      callback(false);
    }
  })
}


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
