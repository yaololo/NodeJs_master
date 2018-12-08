// primary file for the API

// dependencies
const http = require('http');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;

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

    // Send the response
    res.end('hello world\n');

    // Log the request path
    console.log('Request is received on path: ' + trimmedPath + ' with method ' + method +
      ' and with this query string parameters ', queryStringObject);

    console.log('Request with these headers ', headers);

    console.log('Payload: ', buffer);
  })
})

// start the server, and have it listen on port 300
server.listen(3000, function(){
  console.log('Teh server is listening on port 3000 now');
})

