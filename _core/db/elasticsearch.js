var esconfig = require(__dirname + '/configs/esconfig.json')
var unirest = require("unirest");

var es = module.exports = {};

/**
 * a generic function to do the gets|posts|etc
 * @param {string} method - GET|POST|HEAD|etc
 * @param {string} url - endpoint to call
 * @param {object} headers - headers to be sent along with the request
 * @param {object} data - data to be sent
 */
function interact(method, url, headers, data) {
    return new Promise(function (resolve, reject) {
        headers = headers ? headers : {
            "cache-control": "no-cache",
            "Content-Type": "application/x-www-form-urlencoded"
        };
        method = method ? method : 'GET';

        var req = unirest(method, url);
        req.headers(headers);

        req.end(function (res) {
            if (res.error) {
                reject({
                    status: { code: res.code, message: "failed" },
                    message: { error: res.error }
                });
            }
            else {
                resolve({
                    status: { code: 200, message: "success" },
                    message: { response: res.body }
                });
            }
        });
    });
}

/**
 * check if elasticsearch is alive
 */
es.checkConnection = function () {
    return new Promise(function (resolve, reject) {
        interact('GET', esconfig.url, {
            "cache-control": "no-cache",
            "Content-Type": "application/x-www-form-urlencoded"
        })
        .then(function (obj) {
            resolve(obj)
        })
        .catch(function (obj) {
            reject(obj);
        });
    });
}

/**
 * check if index is present of the given name, if not try to create an index
 * @param {string} indexName - name of the index to create
 * @param {string} indexType - name of the document type
 * @param {object} dataObj - object schema
 */
es.checkTable = function(indexName, indexType, dataObj){
    return new Promise(function (resolve, reject) {
        interact('HEAD', esconfig.url + '/' + indexName, {
            "cache-control": "no-cache",
            "Content-Type": "application/x-www-form-urlencoded"
        })
        .then(function (obj) {
            resolve(obj)
        })
        .catch(function (obj) {
            // if the status code is 404 then index is not available, create one
            if (obj.status.code == 404){
                interact('PUT', esconfig.url + '/' + indexName, {
                    "cache-control": "no-cache",
                    "Content-Type": "application/x-www-form-urlencoded"
                })
                .then(function (obj) {
                    resolve(obj)
                })
                .catch(function (obj) {
                    reject(obj);
                });
            }
            else {
                reject(obj);
            }
        });
    });
}

/**
 * given a job id, get the job object
 * @param {string} indexName - name of the
 */
es.getJob = function(indexName, indexType, jobID){
    return new Promise (function(resolve, reject){
        interact('GET', esconfig.url + '/' + indexName + '/' + indexType + '/' + jobID, {
            "cache-control": "no-cache",
            "Content-Type": "application/x-www-form-urlencoded"
        })
        .then(function (obj) {
            resolve(obj)
        })
        .catch(function (obj) {
            reject(obj);
        });
    })
}