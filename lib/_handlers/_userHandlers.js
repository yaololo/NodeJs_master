const _data = require('../data');
const helpers = require('../helpers');
const config = require('../config');

_userHandlers = {};

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

    try {
      await _data.read('users', phone);
      statusCode = 400;
      payload = { 'Error': 'A user with that phone number already exists.' };
      return reject({ statusCode, payload });
    } catch (error) {
    }

    // Hash the password
    let hashedPassword = helpers.hash(password);
    if (!hashedPassword){
      statusCode = 500;
      payload = { 'Error': 'Could not hash the user\'s password' };
      return reject({ statusCode, payload });
    }

    // Create user object
    let userObject = {
      firstName: firstName,
      lastName: lastName,
      phone: phone,
      hashedPassword: hashedPassword,
      tosAgreement: true
    };

    // Stroe the user
    try {
      await _data.create('users', phone, userObject);
      return resolve({ statusCode });
    } catch (error) {
      statusCode = 500;
      payload = { 'Error': 'Could not create the user' };
      return reject({ statusCode, payload });
    }
  })
}

_userHandlers.get = data => {
  return new Promise( async (resolve, reject) => {
    // Check the phone
    // Get request should get information from the query string instead of from the payload
    let statusCode = 200;
    let payload = {};

    let phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if(!phone){
      payload = { 'Error': 'Missing required data' };
      statusCode = 400;
      return reject({ statusCode, payload });
    }

    try {
      let userData = await _data.read('users', phone);
      delete userData.hashedPassword;
      payload = userData;
      return resolve({ statusCode, payload });
    } catch (error) {
      payload = { 'Error': 'Could not read specified user data' };
      statusCode = 400
      return reject({ statusCode, payload });
    }
  })
}

// Required data: phone
// Optional data : firstName, lastName , password (at least one must be specified)
// Only authanticated user to access their own data. Do not let them to access other user's data
_userHandlers.put = data => {
  // Check for the requried field
  return new Promise( async (resolve, reject) => {

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

    try {
      let userData = await _data.read('users', phone);
      if(firstName){
        userData.firstName = firstName;
      }

      if(lastName){
        userData.lastName = lastName;
      }

      if(password){
        userData.hashedPassword = helpers.hash(password);
      }

      try {
        await _data.update('users', phone, userData);
        return resolve({ statusCode });
      } catch (error) {
        statusCode = 500;
        payload = { 'Error': 'Could not update the user' };
        return reject({ statusCode, payload });
      }

    } catch (error) {
      statusCode = 400;
      payload = { 'Error': 'The specified user does not exist' };
      return reject({ statusCode, payload });
    }
  })
};


// Only authanticated user should delete their object only
// Required field phone
// Cleanup (delete) any other data files associated with this user
_userHandlers.delete = data => {
  let statusCode = 200;
  let payload = {};

  return new Promise( async (resolve, reject) => {
    // Check if the phone is valid
    let phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if(!phone) {
      statusCode = 400;
      payload = { 'Error': 'Missing required field' };
      return reject({ statusCode, payload });
    }

    try {
      await _data.read('users', phone);
    } catch (error) {
      statusCode = 400;
      payload = { 'Error': 'Could not find the specified user' };
      return reject({ statusCode, payload });
    }

    try {
      await _data.delete('users', phone);
    } catch (error) {
      statusCode = 500;
      payload = { 'Error': 'Could not delete the specified user'  };
      return reject({ statusCode, payload });
    }
    return resolve({ statusCode })
    // let token = typeof(data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token.trim() : false

    // handlers._tokens.verifyToken(token, phone, function(tokenIsValid){
      // if(!tokenIsValid){
      //   return callback(403, { 'Error': 'Missing required token in header, or token is invalid' });
      // }
      // _data.read('users', phone, function(err, userData){
      //   if(err || !userData){
      //     statusCode = 400;
      //     payload = { 'Error': 'Could not find the specified user' };
      //     return reject({ statusCode, payload });
      //   }
      //   _data.delete('users', phone, function(err){
      //     if(err){
      //       statusCode = 500;
      //       payload = { 'Error': 'Could not delete the specified user'  };
      //       return reject({ statusCode, payload });
      //     }
      //     return resolve({ statusCode });

      //     // Delete all other information associate with the user
      //     // let userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
      //     // let numberOfChecksToDelete = userChecks.length;
      //     // if(numberOfChecksToDelete >0){
      //       // let checksDeleted = 0 ;
      //       // let deletionError = false;

      //       // Loop through the checks
      //       // userChecks.forEach(function(checkId){

      //         // Delete check
      //         // _data.delete('checks', checkId, function(err){
      //         //   if(err){
      //         //     deletionError = true;
      //         //   }
      //         //   checksDeleted++;
      //         //   if(checksDeleted = numberOfChecksToDelete){
      //         //     if(!deletionError){
      //         //       callback(200);
      //         //     } else {
      //         //       callback(500, { 'Error': 'Error encountered while attempting to delete all of the user\'s checks. All checks might not be successfully deleted' });
      //         //     }
      //         //   }
      //         // })
      //       // })
      //     // } else{

      //     // }
      //   })
      // })
    // })
  })
};

module.exports = _userHandlers;