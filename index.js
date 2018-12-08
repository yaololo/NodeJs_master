// primary file for the API

// dependencies
const http = require('http');

// the server should respond to all reqruests with a string
var server = http.createServer(function(req, res){
    res.end('hello world\n');
})

// start the server, and have it listen on port 300
server.listen(3000, function(){
    console.log('Teh server is listening on port 3000 now');
})

