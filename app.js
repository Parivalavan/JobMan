global.config = {};

var bodyParser = require('body-parser')
    , compression = require('compression')
    , config = require('./_config/config.json')
	, express = require('express')
	, favicon = require('serve-favicon')
    , helmet = require('helmet')
    , path = require('path')
	, session = require('express-session')
;

global.config = config;

// session options, with session time set to 30 minutes, resetting maxAge on every request made
var sessionOptions = {
	secret: config.sessionKey,
	resave: false,
	saveUninitialized: true,
	cookie: { maxAge : 1800000 },
    rolling: true
};

var app = express();				// call the express framwork
app.use(express.static(__dirname + "/public"));
// set the required headers
app.use(helmet());
// deliver compressed content
app.use(compression());
// set the sessions
app.use(session(sessionOptions));
// display favicon
app.use(favicon(path.join(__dirname, 'images', 'favicons', 'favicon.ico')))
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({limit: '50mb', extended: true }));
// parse application/json
app.use(bodyParser.json({ type: 'application/json'}));

// app exit normally
process.on('exit', function () {
	console.log('Shutting down JobMan');
	process.exit();
});

// catch ctrl+c event and exit normally
process.on('SIGINT', function () {
	console.log('Force quitting JobMan');
	process.exit();
});

//catch uncaught exceptions, trace, then exit normally
process.on('uncaughtException', function(e) {
    console.log('Uncaught Exception...');
    console.log(e.stack);
	process.exit();
});

var db = require('./_core/db/' + config.dbType + '.js');

db.checkConnection()
.then(function(status){
    return db.checkTable(config.dbName, config.tableName, config.dataObj);
})
.then(function(status){
    appServer = require('http').createServer(app).listen(config.port, function() {
        console.log('                                +-+-+-+-+-+-+-+-+-+-+-+-+');
        console.log('                                |   J o b M a n   1.0   |');
        console.log('                                +-+-+-+-+-+-+-+-+-+-+-+-+');
        console.log('');
        console.log('process environment    : ' + (process.env.NODE_ENV || 'development'));
        console.log('listening on port      : ' + config.port);
        console.log('JobMan is ready ...');
		// Socket.io server listens to our app
		var io = require('socket.io').listen(appServer);
		// Emit welcome message on connection
		io.on('connection', function(socket) {
			// Use socket to communicate with this particular client only, sending it it's own id
			socket.emit('welcome', { message: 'Welcome!', id: socket.id });
		});
		routers = require('./_core/routers.js')(io);
		app.use(routers); // call the controllers

    });
})
.catch(function(e){
	console.log('Unable to establish connection to database', e);
	process.exit();
});
