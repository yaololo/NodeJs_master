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

// Create a string of random alphanumeric characters, of a given length
helpers.createRandomString = function(strLength){
  strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;

  if(!strLength){
    return false;
  }

  // Define all the possible characters that could go into a string
  let possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

  // Start the final string
  let finalStr = '';
  for(let i = 1 ; i <= strLength; i++){
    let randomChar = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
    finalStr += randomChar;
  }
  return finalStr;
}

module.exports = helpers;