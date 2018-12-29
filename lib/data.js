/*
* library for stroing and editing data
*/
// Dependencies
const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

// Container for the module (to be exported)
var lib = {};

// Base directory of the data folder
/* _dirname is where we are right now.  path.join will normalize the path into a nice clear path (absolute path) without ../// */
lib.baseDir = path.join(__dirname, '../.data/');

// Write data to a file
lib.create = (dir, file, data) => {
  return new Promise( async (resolve, reject) => {
    let constructedFilePath = lib.baseDir + dir + '/' + file + '.json';
    // flag wx will fails if the file exist.
    let fd;
    try {
      fd = await fs.openSync(constructedFilePath, 'wx');
    } catch (error) {
      console.log('Could not create new file, it may already exit');
      return reject('Could not create new file, it may already exit');
    }

    try {
      let stringData = JSON.stringify(data);
      await fs.writeFileSync(constructedFilePath, stringData);
    } catch (error) {
      console.log('Could not write to the file');
      return reject('Could not write to the file');
    }

    try {
      await fs.closeSync(fd);
    } catch (error) {
      console.log('Error closing the file');
      return reject('Error closing the file');
    }
    return resolve(true);
  })
}

// Read from a file
lib.read = (dir, file) => {
  return new Promise( async (resolve, reject) => {
    let constructedFilePath = lib.baseDir + dir + '/' + file + '.json';
    try {
      let data = fs.readFileSync(constructedFilePath, 'utf8');
      let parsedData = helpers.parseJsonToObject(data)
      return resolve(parsedData);
    } catch (error) {
      console.log('File does not exist');
      return reject('File does not exist');
    }
  })
}

// Updata data inside a file
lib.update = (dir, file ,data) => {
  return new Promise( async (resolve, reject) => {
    let constructedFilePath = lib.baseDir + dir + '/' + file + '.json';

    // Opend the file for writting
    let fd;
    try {
      fd = await fs.openSync(constructedFilePath, 'r+');
    } catch (error) {
      console.log('The specific file doex not exists');
      return reject('The specific file doex not exists');
    }

    try {
      // Set the file to zero byte, but the file still exists on the disk
      await fs.truncateSync(constructedFilePath)
    } catch (error) {
      console.log('The specific file doex not exists');
      return reject('The specific file doex not exists');
    }

    try {
      let stringData = JSON.stringify(data);
      await fs.writeFileSync(constructedFilePath, stringData);
    } catch (error) {
      console.log('Error writting to existing file');
      return reject('Error writting to existing file');
    }

    try {
      await fs.closeSync(fd);
    } catch (error) {
      console.log('Error closing the file');
      return reject('Error closing the file');
    }
    return resolve(true);
  })
}

// Delete a file
lib.delete = (dir, file) => {
  return new Promise( async (resolve, reject) => {
    let constructedFilePath = lib.baseDir + dir + '/' + file + '.json';

    // Unlink the file which is remove the file from the file system
    try {
      await fs.unlinkSync(constructedFilePath);
    } catch (error) {
      console.log('Error deleting file');
      return reject('Error deleting file');
    }
    return resolve(true);
  })
}

module.exports = lib;