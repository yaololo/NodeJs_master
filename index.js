// primary file for the API

// dependencies
const http = require('http');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');

// the server should respond to all reqruests with a string
var server = http.createServer(function(req, res){

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
})

// start the server, and have it listen on port 300
server.listen(config.port, function(){
  console.log(`The server is listening on port ${config.port} in ${config.envName} mode`);
})

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