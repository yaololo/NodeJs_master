// primary file for the API

// dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const fs = require('fs');

// Instantiate the HTTP server
var httpServer = http.createServer(function(req, res){
  undefined(req, res);
})

// Start the server
httpServer.listen(config.httpPort, function(){
  console.log(`HTTP server is listening on port ${config.httpPort} in ${config.envName} mode`);
})

// Instantiate the HTTPS server
var httpsServerOptions = {
  // get the key and cert synchronously so the data of the file can be the key and certificte
  'key': fs.readFileSync('./https/key.pem'),
  'cert': fs.readFileSync('./https/cert.pem')
};
var httpsServer = https.createServer(httpsServerOptions, function(req, res){
  unifiedServer(req. res);
})

httpsServer.listen(config.httpsServer, function(){
  console.log(`HTTPS server is listening on port ${config.httpsPort} in ${config.envName} mode`)
})


// All the server logic for both http and https server
var unifiedServer = function(req, res){
  // Get the url and parse it
  var parsedUrl = url.parse(req.url, true);

  // Get the path (untrim the path by using pathname)
  var path = parsedUrl.pathname;
  var trimmedPath = path.replace(/^\/+|\/+$/g, '');

  // Get the query string as an object
  var queryStringObject = parsedUrl.query

  // Get the HTTP Method
  var method = req.method.toLowerCase();

  // Get the header as an object
  var headers = req.headers;

  // Get the payload, if any
  var decoder = new StringDecoder('utf-8');
  var buffer = '';

  // As data stream in, the req object emits data event that binds to a callback
  req.on('data', function(data){
    buffer += decoder.write(data);
  })


  req.on('end', function(){
    buffer += decoder.end();

    // Choose the handler this request should go to, use notFound handler to handle unmatched handler
    var chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

    // Construct data object to send to handler
    var data = {
      'trimmedPath' : trimmedPath,
      'queryStringObject': queryStringObject,
      'method': method,
      'headers': headers,
      'payload': buffer
    }

    // Route the quest to the handler specified in the router
    chosenHandler(data, function(statusCode, payload){
      // use the statusCode called back by the handler, or default to 200
      statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

      // User the payload called back by handler, or defualt empty object
      payload = typeof(payload) == 'object' ? payload : {};

      // Convert the payload to a string
      var payloadString = JSON.stringify(payload);

      // Return the response
      // res.setHeader('Contnent-type', 'application/json');
      res.writeHead(statusCode);
      res.end(payloadString);

      // Log the request path
      console.log('Returning this response:', statusCode, payloadString,)
    })
  })
}

// Define handlers
var handlers = {};
handlers.sample = function(data, callback){
  callback(406, {'name': 'sample handler'});
}

handlers.notFound = function(data, callback){
  callback(404);
}

// Define a request router
var router = {
  'sample': handlers.sample
}