var express = require('express'),
    request = require('request'),
    async = require('async'),
    AggregatorController = require('../AggregatorController'),
    Post = require('../../model/Post');

exports.aggregateData = function(user, agency) {
    var $that = this;

    //AggregatorController.runWithTimeout(agency.election.frequency, null, function(){
        $that.extractData(user, agency);
    //});
}

exports.extractData = function(user, agency){
    var tasks = [];
    var $that = this;

    agency.election['feeds'].forEach(function(election){
        tasks.push(function(callback){
            $that.extractElectionData(agency.yelp, user, election, function(posts){
                $that.savePosts(user.name, agency.name, posts, callback);
            });
        });
    });

    async.parallel(tasks, function(){
    });
}

exports.extractElectionData = function(agency, user, election, callback){
    var url = "https://www.googleapis.com/civicinfo/v2/voterinfo?";

    url += "address=" + (election.address!=undefined ? election.address.replace(" ","+") : "");
    url += "&electionId=" + election.electionId;
    url += "&key=" + config.apps.google.key;

    request({
        url: url,
        method: 'GET'
    }, function(error, response, body) {
        if(error || !body || !response) {
            return callback(undefined);
        } else {
            body = JSON.parse(body);
            console.log(body);

            if(body.error!=undefined) {
                return callback(undefined);
            } else {
                return callback(body);
            }
        }
    });
}

exports.savePosts = function(userName, agencyName, posts, callback){

}