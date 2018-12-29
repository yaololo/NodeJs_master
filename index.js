// primary file for the API

// dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./lib/config');
const fs = require('fs');
const handlers = require('./lib/handler');
const helpers = require('./lib/helpers');

// Instantiate the HTTP server
let httpServer = http.createServer(function(req, res){
  unifiedServer(req, res);
})

// Start the server
httpServer.listen(config.httpPort, function(){
  console.log(`HTTP server is listening on port ${config.httpPort} in ${config.envName} mode`);
})

// Instantiate the HTTPS server
let httpsServerOptions = {
  // get the key and cert synchronously so the data of the file can be the key and certificte
  'key' : fs.readFileSync('./https/key.pem'),
  'cert' : fs.readFileSync('./https/cert.pem')
};

let httpsServer = https.createServer(httpsServerOptions, function(req, res){
  unifiedServer(req. res);
})

httpsServer.listen(config.httpsServer, function(){
  console.log(`HTTPS server is listening on port ${config.httpsPort} in ${config.envName} mode`)
})

// All the server logic for both http and https server
let unifiedServer = function(req, res){

  // Get the url and parse it
  let parsedUrl = url.parse(req.url, true);

  // Get the path (untrim the path by using pathname)
  let path = parsedUrl.pathname;
  let trimmedPath = path.replace(/^\/+|\/+$/g, '');

  // Get the query string as an object
  let queryStringObject = parsedUrl.query

  // Get the HTTP Method
  let method = req.method.toLowerCase();

  // Get the header as an object
  let headers = req.headers;

  // Get the payload, if any
  let decoder = new StringDecoder('utf-8');
  let buffer = '';

  // As data stream in, the req object emits data event that binds to a callback
  req.on('data', function(data){
    buffer += decoder.write(data);
  })

  req.on('end', async function(){
    buffer += decoder.end();

    // Choose the handler this request should go to, use notFound handler to handle unmatched handler
    let chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

    // Construct data object to send to handler
    let data = {
      'trimmedPath' : trimmedPath,
      'queryStringObject': queryStringObject,
      'method': method,
      'headers': headers,
      'payload': helpers.parseJsonToObject(buffer)
    }

    // Route the quest to the handler specified in the router
    let returnObj = await chosenHandler(data);
    let statusCode = typeof(returnObj.statusCode) == 'number' ? returnObj.statusCode : 500;
    let payload = typeof(returnObj.payload) == 'object' ? returnObj.payload : {};
    let payloadString = JSON.stringify(payload);

    res.writeHead(statusCode);
    res.end(payloadString);

    // Log the request path
    console.log('Returning this response:', statusCode, payloadString);
  })
}


// Define a request router
let router = {
  'ping': handlers.ping,
  'users': handlers.users,
  'tokens': handlers.tokens,
  'checks': handlers.checks
}