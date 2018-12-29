const _userHandlers = require('./_handlers/_userHandlers');
const _tokenHandlers = require('./_handlers/_tokenHandlers');
const _checksHandlers = require('./_handlers/_checkHandler');

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

handlers.checks = async data => {
  var acceptableMethods = ['post', 'get', 'put', 'delete'];

  if(acceptableMethods.indexOf(data.method) <= -1){
    let statusCode = 405;
    return { statusCode };
  }

  try {
    let result = await _checksHandlers[data.method](data);
    return result;
  } catch (error) {
    return error;
  }
};

module.exports = handlers;
