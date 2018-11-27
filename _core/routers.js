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
    var socket = io;
    // we need an object to store the jobs categorised by processtype (microservices)
    var jm = {};
    Object.keys(config.servers).forEach(function (key) {
        jm[key] = {};
    });
    router.use(bodyParser.urlencoded({ limit: '5mb', extended: true }))		// parse application/x-www-form-urlencoded
    router.use(bodyParser.json({ type: 'application/json' }))				// parse application/json
    router.use(cookieParser());

    /**
     * add a job to the queue
     */
    router.post('/addJob', function (req, res) {
        var reqObj = req.body;
        // check for missing parameters
        if (!reqObj.id || !reqObj.processType) {
            res.status(500).json({
                'status': { 'code': 500, 'message': 'failure' },
                'message': { 'error': 'Looks like you have not provided required parameters (id, processType)' }
            }).end();
            return false;
        }
        // check if the requested job of given process type exists and is in progress. If so return the job id
        else if (jm[reqObj.processType] && jm[reqObj.processType][reqObj.id]) {
            res.status(200).json({
                'status': { 'code': 200, 'message': 'success' },
                'message': { 'jobid': jm[reqObj.processType][reqObj.id].jobID, 'log': 'job already exists' }
            }).end();
            return false;
        }
        var jobID = uuidV4();
        var jobObj = JSON.stringify(config.dataObj);
        jobObj = jobObj.replace(/\{\{jobID\}\}/, jobID).replace(/\{\{currTime\}\}/gi, (new Date).getTime());
        jobObj = JSON.parse(jobObj.replace('{{processType}}', reqObj.processType));
        db.updateJob(config.dbName, config.tableName, reqJobID, jobObj)
            .then(function (result) {
                res.status(200).json({
                    'status': { 'code': 200, 'message': 'success' },
                    'message': { 'jobid': jobID, 'log': 'Job added successfully' }
                }).end();
                processJob(reqObj.processType);
            })
            .catch(function (err) {
                res.status(500).json({
                    'status': { 'code': 500, 'message': 'failure' },
                    'message': { error: err, 'log': 'Unable to add job' }
                }).end();
            });
    });

    router.post('/updateJob', function (req, res) {
        // based on the status code returned
    });

    /**
     * fetch the job object for the given id, look into in-progress jobs object and then into db if not found
     */
    router.post('/jobStatus', function (req, res) {
        var reqJobID = req.body.id;
        if (!req.body.id) {
            res.status(500).json({
                'status': { 'code': 500, 'message': 'failure' },
                'message': { 'error': 'please provide a valid job id' }
            }).end();
        }
        else if (jm[reqJobID]) {
            res.status(200).json({
                'status': { 'code': 200, 'message': 'success' },
                'message': { reqJobID: jm[reqJobID] }
            }).end();
        }
        else {
            db.getJob(config.dbName, config.tableName, reqJobID)
                .then(function (result) {
                    res.status(200).json({
                        'status': { 'code': 200, 'message': 'success' },
                        'message': { reqJobID: result }
                    }).end();
                })
                .catch(function (err) {
                    res.status(500).json({
                        'status': { 'code': 500, 'message': 'failure' },
                        'message': { error: err }
                    }).end();
                });
        }
    });

    router.post('/deleteJob', function (req, res) {
    });

    router.all('*', function (req, res) {
        res.status(404).json({
            "status": { "code": 404, "message": "not found" },
            "message": "Either an incorrect request method (GET instead of POST?) is used or the resource requested does not exist"
        });
    });

    return router;
}