const _data = require('../data');
const helpers = require('../helpers');
// const config = require('./config');

let _tokenHandlers = {}
// Required data : phone, passwored
// Optional
_tokenHandlers.post = data => {

  return new Promise( async (resolve, reject) => {
    let phone = typeof data.payload.phone == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    let password = typeof data.payload.password == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    let statusCode = 200;
    let payload = {};

    if(!phone || !password){
      return callback(400, { 'Error': 'Missing required fields' });
    }

    try {
      let userData = await _data.read('users', phone);
      let hashedPassword = helpers.hash(password);
      if( hashedPassword !== userData.hashedPassword){
        statusCode = 400;
        payload = { 'Error': 'Password did not match the specified users password' };
        return reject({ statusCode, payload });
      }
    } catch (error) {
      statusCode = 400;
      payload ={'Error': 'Could not fined the specified user' };
      return reject({ statusCode, payload });
    }

    // Set token to one hour
    let tokenId = helpers.createRandomString(20);
    let expires = Date.now() + 1000 * 60 * 60;
    let tokenObject = {
      'phone': phone,
      'id': tokenId,
      'expires': expires
    };

    try {
      await _data.create('tokens', tokenId, tokenObject);
      payload = tokenObject;
      return resolve({ statusCode, payload });
    } catch (error) {
      statusCode = 500;
      payload = { 'Error': 'Could not create the new token' };
      return reject({ statusCode, payload });
    }
  })
}

// Required data: token ID
_tokenHandlers.get = data => {
  return new Promise( async (resolve, reject) => {
    let statusCode = 200;
    let payload = {};
    let tokenId = typeof(data.queryStringObject.tokenId) == 'string' && data.queryStringObject.tokenId.trim().length == 20 ? data.queryStringObject.tokenId.trim() : false;
    if(!tokenId) {
      statusCode = 400;
      payload = { 'Error': 'Missing required field'};
      return reject({ statusCode, payload });
    }

    try {
      let tokenData = await _data.read('tokens', tokenId);
      payload = tokenData;
      return resolve({ statusCode, payload });
    } catch (error) {
      statusCode = 404;
      return reject({ statusCode });
    }
  })
}

// Required data : id, extend
_tokenHandlers.put = data => {
  return new Promise( async (resolve, reject) => {
    let statusCode = 200;
    let payload = {};
    let tokenId = typeof(data.payload.tokenId) == 'string' && data.payload.tokenId.trim().length == 20 ? data.payload.tokenId.trim() : false;
    let extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend === true ? data.payload.extend : false;

    if(!tokenId || !extend ){
      statusCode = 400;
      payload = { 'Error': 'Missing required fields or fields invalid' };
      return reject({ statusCode, payload });
    }

    try {
      let tokenData = await _data.read('tokens', tokenId);
      if(tokenData.expires <= Date.now()){
        statusCode = 400;
        payload =  { 'Error': 'The token is already expired, it can not be extended' };
        return reject({ statusCode, payload });
      }

      tokenData.expires = Date.now() + 1000 * 60 *60;
      try {
        await _data.update('tokens', tokenId, tokenData);
        return resolve({ statusCode });
      } catch (error) {
      statusCode = 500;
      payload = { 'Error': 'Specified token does no exist' };
      return reject({ statusCode, payload });
      }

    } catch (error) {
      statusCode = 400;
      payload = { 'Error': 'Could not update the token\' expiration'};
      return reject({ statusCode, payload });
    }
  })
}

_tokenHandlers.delete = data => {
  // Check if the token ID is valid
  return new Promise( async (resolve, reject) => {
    let statusCode = 200;
    let payload = {};
    let tokenId = typeof(data.payload.tokenId) == 'string' && data.payload.tokenId.trim().length == 20 ? data.payload.tokenId.trim() : false;
    if(!tokenId) {
      statusCode = 400;
      payload = { 'Error': 'Missing required field'};
      return reject({ statusCode, payload });
    }

    try {
      await _data.read('tokens', tokenId)
    } catch (error) {
      statusCode = 400;
      payload = { 'Error': 'Could not find the specified token' };
      return reject({ statusCode, payload });
    }

    try {
      await _data.delete('tokens', tokenId);
      return resolve({ statusCode });
    } catch (error) {
      statusCode = 400;
      payload = { 'Error': 'Could not find the specified token' };
      return reject({ statusCode, payload });
    }
  })
}


// Verify if a given token id is current valid for a given user
_tokenHandlers.verifyToken = async (tokenId, phone) => {
  // Lookup the token
  try {
    let tokenData = await _data.read('tokens', tokenId);
    if(tokenData.phone == phone && tokenData.expires > Data.now()){
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
}

module.exports = _tokenHandlers