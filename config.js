/*
* Create and export configuration variables
*
*/

// Container for all the environments
var envrionments = {};

// Staging(default) object
envrionments.staging = {
  'port' : 3000,
  'envName': 'staging'
};


envrionments.production = {
  'port' : 5000,
  'envName': 'production'
};

// Determine which environment was passed as a command-line argument
var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check if the current environment is one of the environments above, if not, default to staging
var environmentToExport = typeof(envrionments[currentEnvironment]) == 'object' ? envrionments[currentEnvironment] : envrionments.staging

module.exports = environmentToExport