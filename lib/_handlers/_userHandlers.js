const _data = require('../data');
const helpers = require('../helpers');
const config = require('../config');

_userHandlers = {};

_userHandlers.get = data => {
  return new Promise((resolve, reject) => {
  // Check the phone
  // Get request should get information from the query string instead of from the payload

    let phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    let statusCode = 200;
    let payload = {};
    if(!phone){
      payload = { 'Error': 'Missing required data' };
      statusCode = 400;
      return reject({ statusCode, payload });
    }

    _data.read('users', phone, function(err, userData){
      if(!err && userData){
        // Remove the hashed password from the user object before returning the user object back to user

        delete userData.hashedPassword;
        payload = userData.hashedPassword
        return resolve({ statusCode })
      } else {
        payload = { 'Error': 'Could not read specified user data' };
        statusCode = 400
        return reject({ statusCode, payload });
      }
    })
  })
}

_userHandlers.post = data => {
  let statusCode = 200;
  let payload = {};

  return new Promise( async (resolve, reject) => {
    let firstName = typeof data.payload.firstName == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    let lastName = typeof data.payload.lastName == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    let phone = typeof data.payload.phone == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    let password = typeof data.payload.password == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    let tosAgreement = typeof data.payload.tosAgreement == 'boolean' && data.payload.tosAgreement == true ? true : false;

    if(!firstName || !lastName || ! phone || !password || !tosAgreement){
      statusCode = 500;
      payload = { 'Error': 'Missing required fields' };
      return reject({ statusCode, payload });
    }

    _data.read('users', phone, async function(err, data) {
      // Make usre thiere no existing user of the same phone number
      if(!err){
        statusCode = 400;
        payload = { 'Error': 'A user with that phone number already exists.' };
        return reject({ statusCode, payload });
      }
      // Hash the password
      let hashedPassword = helpers.hash(password);

      if (!hashedPassword){
        statusCode = 500;
        payload = { 'Error': 'Could not hash the user\'s password' };
        return reject({ statusCode, payload });
      }

      // Create user object
      let userObjuect = {
        firstName: firstName,
        lastName: lastName,
        phone: phone,
        hashedPassword: hashedPassword,
        tosAgreement: true
      };

      // Stroe the user
      try {
        await _data.create('users', phone, userObjuect);
        return resolve({ statusCode });
      } catch (error) {
        console.log(error);
        statusCode = 500;
        payload = { 'Error': 'Could not create the user' };
        return reject({ statusCode, payload });
      }
    });
  })
}

// Required data: phone
// Optional data : firstName, lastName , password (at least one must be specified)
// Only authanticated user to access their own data. Do not let them to access other user's data
_userHandlers.put = data => {
  // Check for the requried field
  return new Promise( (resolve, reject) => {

    let phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    let firstName = typeof data.payload.firstName == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    let lastName = typeof data.payload.lastName == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    let password = typeof data.payload.password == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    let statusCode = 200;
    let payload = {};

    // Error if the phone is invalid
    if(!phone){
      statusCode = 400;
      payload = { 'Error': 'Missing required field' };
      return reject({ statusCode, payload });
    }

    if(!firstName && !lastName && !password){
      statusCode = 400;
      payload = { 'Error': 'Missing fields to update' };
      return reject({ statusCode, payload });
    }

    // let token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

    _data.read('users', phone, function(err, userData){

      if(err || !userData){
        statusCode = 400;
        payload = { 'Error': 'The specified user does not exist' };
        return reject({ statusCode, payload });
      }

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
          statusCode = 500;
          payload = { 'Error': 'Could not update the user' };
          return reject({ statusCode, payload });
        }
        return resolve({ statusCode });
      })

    })
  })
};


// Only authanticated user should delete their object only
// Required field phone
// Cleanup (delete) any other data files associated with this user
_userHandlers.delete = data => {
  let statusCode = 200;
  let payload = {};

  return new Promise( (resolve, reject) => {
    // Check if the phone is valid
    let phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if(!phone) {
      statusCode = 400;
      payload = { 'Error': 'Missing required field' };
      return reject({ statusCode, payload });
    }

    // let token = typeof(data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token.trim() : false

    // handlers._tokens.verifyToken(token, phone, function(tokenIsValid){
      // if(!tokenIsValid){
      //   return callback(403, { 'Error': 'Missing required token in header, or token is invalid' });
      // }
      _data.read('users', phone, function(err, userData){
        if(err || !userData){
          statusCode = 400;
          payload = { 'Error': 'Could not find the specified user' };
          return reject({ statusCode, payload });
        }
        _data.delete('users', phone, function(err){
          if(err){
            statusCode = 500;
            payload = { 'Error': 'Could not delete the specified user'  };
            return reject({ statusCode, payload });
          }
          return resolve({ statusCode });

          // Delete all other information associate with the user
          // let userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
          // let numberOfChecksToDelete = userChecks.length;
          // if(numberOfChecksToDelete >0){
            // let checksDeleted = 0 ;
            // let deletionError = false;

            // Loop through the checks
            // userChecks.forEach(function(checkId){

              // Delete check
              // _data.delete('checks', checkId, function(err){
              //   if(err){
              //     deletionError = true;
              //   }
              //   checksDeleted++;
              //   if(checksDeleted = numberOfChecksToDelete){
              //     if(!deletionError){
              //       callback(200);
              //     } else {
              //       callback(500, { 'Error': 'Error encountered while attempting to delete all of the user\'s checks. All checks might not be successfully deleted' });
              //     }
              //   }
              // })
            // })
          // } else{

          // }
        })
      })
    // })
  })

};

module.exports = _userHandlers;