const _data = require('./data.js');
const helpers = require('./helpers');

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

  _data.read('users', phone, function(err, data){
    if(!err && data){
      // Remove the hashed password from the user object before returning the user object back to user
      delete data.hashedPassword;
      callback(200, data);
    } else {
      callback(404);
    }
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

  _data.read('users', phone, function(err, data){
    if(!err && data){
      _data.delete('users', phone, function(err){
        if(err){
          return callback(500, { 'Error': 'Could not delete the specified user' })
        }
        callback(200);
      })
    } else {
      callback(400, { 'Error': 'Could not find the specified user' });
    }
  })
};

module.exports = handlers;
