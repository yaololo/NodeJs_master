/*
* Helpers for various tasks
*
*/
const crypto = require('crypto');
const config = require('./config');

let helpers = {};

helpers.hash = function(password){
  // Create a SHA256 hash
  if(typeof(password) == 'string' && password.length > 0){
    let hash = crypto.createHmac('sha256', config.hashingSecrete).update(password).digest('hex');
    return hash;
  } else {
    return false;
  }
}

helpers.parseJsonToObject = function(payload){
  // Handle parsing error
  try {
    let object = JSON.parse(payload)
    return object;

  } catch (error) {
    return {}
  }
}



module.exports = helpers;