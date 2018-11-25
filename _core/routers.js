var bodyParser = require('body-parser')
	, cookieParser = require('cookie-parser')
	, express = require('express')
	, path = require('path')
	, router = express.Router()
	, unires = require('unirest')
	, uuidV4 = require('uuid/v4')
;

module.exports = function (io) {
	socket = io;
	router.use(bodyParser.urlencoded({ limit: '5mb', extended: true }))		// parse application/x-www-form-urlencoded
	router.use(bodyParser.json({ type: 'application/json' }))				// parse application/json
    router.use(cookieParser());

    router.post('/addJob', function (req, res) {
    });

    router.post('/updateJob', function (req, res) {
    });

    router.post('/jobStatus', function (req, res) {
    });

    router.post('/deleteJob', function (req, res) {
    });

    router.all('*', function(req, res){
        res.status(404).json({
            "status":{"code":404,"message":"not found"},
            "message": "Either an incorrect request method (GET instead of POST?) is used or the resource requested does not exist"
        });
    });

    return router;
}