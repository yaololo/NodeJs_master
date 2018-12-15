/*
* library for stroing and editing data
*
*/

// Dependencies
const fs = require('fs');
const path = require('path');

// Container for the module (to be exported)
var lib = {};

// Base directory of the data folder
/* _dirname is where we are right now.  path.join will normalize the path into a nice clear path (absolute path) without ../// */
lib.baseDir = path.join(__dirname, '../.data/');

// Write data to a file
lib.create = function(dir, file, data, callback){
  // Open the file for writting
  fs.open(lib.baseDir + dir + '/' + file + '.json', 'wx', function(err, fileDescriptor){
    if(!err && fileDescriptor){
      // convert data into string
      var stringData = JSON.stringify(data);

      // Write to file and close it
      fs.writeFile(fileDescriptor, stringData, function(err){
        if(!err){
          fs.close(fileDescriptor, function(err){
            if(err) {
              callback('Error closing new file');
            } else {
              callback(false);
            }
          })
        } else {
          callback('Error writing to new file')
        }
      })
    } else {
      callback('Could not create new file, it may already exit');
    }
  });
}

// Read from a file
lib.read = function(dir, file, callback){
  fs.readFile(lib.baseDir + dir + '/' + file + '.json', 'utf8', function(err, data){
    callback(err, data);
  })
}


// Updata data inside a file
lib.update = function (dir, file ,data, callback){
  // Opend the file for writting
  fs.open(lib.baseDir + dir + '/' + file + '.json', 'r+', function(err, fileDescriptor){
    if(err || !fileDescriptor) return callback('Could not open the file for update, it may not exit yet.');

    var stringData = JSON.stringify(data);

    // Truncate the file
    fs.ftruncate(fileDescriptor, function(err){
      if(err) return callback('Error truncating the file');

      fs.writeFile(fileDescriptor, stringData, function(err){
        if(err) return callback('Error writting to existing file');

        fs.close(fileDescriptor, function(err){
          err ? callback(err) : callback(false);
        })
      })
    })
  })
}

// Delete a file
lib.delete = function(dir, file, callback){
  // Unlink the file which is remove the file from the file system
  fs.unlink(lib.baseDir + dir + '/' + file + '.json', function(err){
    err ? callback('Error deleting file') : callback(false);
  })
}

module.exports = lib;