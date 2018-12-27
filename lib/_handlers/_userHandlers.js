const _data = require('../data');
const helpers = require('../helpers');
const tokenHandlers = require('./_tokenHandlers');

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
    let token = typeof data.headers.token == 'string' ? data.headers.token : false;

    if(!phone){
      payload = { 'Error': 'Missing required data' };
      statusCode = 400;
      return reject({ statusCode, payload });
    }

    let isTokenValid = tokenHandlers.verifyToken(token, phone);
    if(!isTokenValid){
      payload = { 'Error': 'Invalid token' };
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

    let token = typeof data.headers.token == 'string' ? data.headers.token : false;
    let isTokenValid = tokenHandlers.verifyToken(token, phone);
    if(!isTokenValid){
      payload = { 'Error': 'Invalid token' };
      statusCode = 400;
      return reject({ statusCode, payload });
    }

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

    let token = typeof data.headers.token == 'string' ? data.headers.token : false;
    let isTokenValid = tokenHandlers.verifyToken(token, phone);
    if(!isTokenValid){
      payload = { 'Error': 'Invalid token' };
      statusCode = 400;
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
  })
};

module.exports = _userHandlers;