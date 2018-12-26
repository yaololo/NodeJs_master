
// const _handlers = require('./lib/_handlers/_userHandlers');

// let handlers = {};

// let data = {
//   method: 'post',
//   queryStringObject: {
//     phone: '1234567890'
//   }
// }

// let testHandler = async data => {
//   try {
//     let data1 = await _userHandlers.get(data);
//     return data1;
//   } catch (error) {
//     return error;
//   }
// }

// let m = async function(data){
//   let done = await testHandler(data);
//   console.log(done);
// }
// m(data);
// testHandler(data);
// console.log(testHandler(data));
const util = require('util');
const fs = require('fs');
const path = require('path');

// Container for the module (to be exported)
var lib = {};
lib.baseDir = path.join(__dirname, '../.data/');
let dir = 'users';
let file = '1234567891';
let data = {
  'firstName': 'john',
  'lastName': 'wick'
}

lib.create = function(dir, file, data) {
  const openSync = util.promisify(fs.openSync);
  const writeFileSync =util.promisify(fs.writeFileSync);
  const closeSync = util.promisify(fs.closeSync);
  return new Promise( (resolve, reject) => {
    // let constructedFilePath = lib.baseDir + dir + '/' + file + '.json';
    // flag wx will fails if the file exist.

      try {
        await openSync(constructedFilePath, 'wx');
      } catch (error) {
        return reject('Could not create new file, it may already exit');
      }

      try {
        let stringData = JSON.stringify(data);
        await writeFileSync(constructedFilePath, stringData)
      } catch (error) {
        return reject('Error writing to new file');
      }

      try {
        await closeSync(fd);
      } catch (error) {
        return reject('Error closing the file');
      }

      return resolve(false);

      let constructedFilePath = lib.baseDir + dir + '/' + file + '.json';
      // flag wx will fails if the file exist.
      let fd = fs.openSync(constructedFilePath, 'wx');
      if(!fd){
        return reject('Could not create new file, it may already exit');
      }

      let stringData = JSON.stringify(data);
      let islWritten = fs.writeFileSync(constructedFilePath, stringData);

      if(!islWritten){
        return reject('Error writing to new file');
      }

      let isClosed = fs.closeSync(fd);
      if(!isClosed){
        return reject('Error closing the file');
      }

      return resolve(false);
  })
}

let test = async () => {
  try {
    let result = await lib.create(dir, file ,data);
    console.log('all good');
  } catch (error) {
    console.log(error);
  }
  // console.log(result);
}

test();