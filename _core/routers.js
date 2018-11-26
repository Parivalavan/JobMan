var bodyParser = require('body-parser')
    , cookieParser = require('cookie-parser')
    , db = require('../_core/db/' + config.dbType + '.js')
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
        var reqJobID = req.body.id;
        if (typeof (req.body) == 'undefined' || !req.body.id) {
            res.status(500).json({
                'status': { 'code': 500, 'message': 'failure' },
                'message': {'error' : 'please provide a valid job id'}
            }).end();
		}
		else if (jm[reqJobID]) {
            res.status(200).json({
                'status': { 'code': 200, 'message': 'success' },
                'message': {reqJobID : jm[reqJobID]}
            }).end();
        }
        else {
            db.getJob(config.dbName, config.tableName, reqJobID)
			.then(function (result) {
                res.status(200).json({
                    'status': { 'code': 200, 'message': 'success' },
                    'message': {reqJobID : result}
                }).end();
			})
			.catch(function (err) {
                res.status(500).json({
                    'status': { 'code': 500, 'message': 'failure' },
                    'message': {error : err}
                }).end();
			})
        }
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