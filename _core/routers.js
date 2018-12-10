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
    /**
     * we need an object to store the jobs categorised by processtype (microservices)
     *
     * {
     *   "MicroService1": {
     *     "http://localhost": {
     *       "9011": {
     *         "step1": "",
     *         "step2": "",
     *         "step3": ""
     *       },
     *       "9012": {
     *         "step1": "",
     *         "step2": "",
     *         "step3": ""
     *       },
     *       "9013": {
     *         "step1": "",
     *         "step2": "",
     *         "step3": ""
     *       },
     *       "9014": {
     *         "step1": "",
     *         "step2": "",
     *         "step3": ""
     *       }
     *     }
     *   }
     * }
     */
    var jm = {}; var jobsObj = {};
    Object.keys(config.servers).forEach(function (serviceName) {
        jm[serviceName] = {};
        jobsObj[serviceName] = {};
        console.log('serviceName:', serviceName);
        var serviceObj = config.servers[serviceName];
        Object.keys(serviceObj).forEach(function (serviceIndex) {
            var serverObj = serviceObj[serviceIndex];
            Object.keys(serverObj).forEach(function (host) {
                jm[serviceName][host] = {};
                console.log('service host:', host);
                var portsArray = serverObj[host];
                Object.keys(portsArray).forEach(function (portIndex) {
                    var portNumber = portsArray[portIndex];
                    jm[serviceName][host][portNumber] = {};
                    var serviceSteps = config.steps[serviceName];
                    Object.keys(serviceSteps).forEach(function (stepIndex) {
                        jm[serviceName][host][portNumber][serviceSteps[stepIndex]] = "";
                        console.log(portNumber);
                    });
                });
            });
        });
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
        // set the default job priority if not given or if unknown value
        if (!reqObj.priority) {
            reqObj.priority = 'low';
        }
        else if (!/^(low|normal|high)$/.test(reqObj.priority)){
            reqObj.priority = 'low';
        }
        db.updateJob(config.dbName, config.tableName, reqJobID, jobObj)
            .then(function (result) {
                res.status(200).json({
                    'status': { 'code': 200, 'message': 'success' },
                    'message': { 'jobid': jobID, 'log': 'Job added successfully' }
                }).end();
                jobObj.killJob = setTimeout(function(){
                    killJob(jobID);
                }, config.ttl[reqObj.processType]);
                jobsObj[reqObj.processType][jobID] = jobObj;
                processJob(reqObj.processType);
            })
            .catch(function (err) {
                jobObj.status = 'failed';
                jobObj.log.push('Failed to update DB');
                res.status(500).json({
                    'status': { 'code': 500, 'message': 'failure' },
                    'message': { error: err, 'log': 'Unable to add job' }
                }).end();
            });
    });

    router.post('/updateJob', function (req, res) {
        /**
         * Sample request body would be like
         *
         *   {
         *       "status": {
         *       "code": 202,
         *       "message": "in-progress"
         *       },
         *       "message": {
         *       "log": "Reading configs...",
         *       "endPoint": "collectfiles",
         *       "jobid": "jobnum",
         *       "progress": 0,
         *       "step": "Read configs"
         *       }
         *   }
         *
         * The following are the `status.code` expected:
         * 200 - the step/stage has completed
         * 202 - work in-progress / progress update
         * 500 - something went wrong during processing
         *
         */
        var reqObj = req.body;
        if (!reqObj.status || !reqObj.status.code) {
            res.status(500).json({
                'status': { 'code': 500, 'message': 'failure' },
                'message': { 'error': 'please provide a status object with status.code having `200|202|500`' }
            }).end();
            return true;
        }
        if (reqObj.status.code == 200) {

        }
        else if (reqObj.status.code == 500) {

        }

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
        res.status(200).json({
            'status': { 'code': 200, 'message': 'success' },
            'message': { 'log': 'To Be Implemented' }
        }).end();
    });

    router.all('*', function (req, res) {
        res.status(404).json({
            "status": { "code": 404, "message": "not found" },
            "message": "Either an incorrect request method (GET instead of POST?) is used or the resource requested does not exist"
        });
    });

    return router;
}