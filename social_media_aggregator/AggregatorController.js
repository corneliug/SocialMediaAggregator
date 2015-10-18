var express            = require('express'),
    FacebookAggregator = require('./data_extractors/FacebookAggregator'),
    TwitterAggregator = require('./data_extractors/TwitterAggregator'),
    InstagramAggregator = require('./data_extractors/InstagramAggregator'),
    YoutubeAggregator = require('./data_extractors/YoutubeAggregator'),
    SocrataAggregator = require('./data_extractors/SocrataAggregator'),
    FoursquareAggregator = require('./data_extractors/FoursquareAggregator'),
    config = require("../config/config.js"),
    _ = require('lodash'),
    User = require('../model/User');

var CRITERIA_TYPE = {
    HASHTAG : 'hashtag',
    ACCOUNT : 'account',
    URL : '|',
}

exports.startExecution = function(){
    var $that = this;
    $that.extractData();

    setInterval(function(){
        $that.extractData();
    }, config.app.frequency * 1000);
}

exports.runWithTimeout = function(timeout, execute){
    setInterval(function(){
        execute();
    }, timeout * 1000);
}

var extractDataForUser = function(user) {
    _.forEach(user.agencies, function(agency) {
        // console.log("extracting for agency: ");
        // console.log(agency);
        if(agency.facebook["feeds"].length) {
            FacebookAggregator.aggregateData(user.name, agency.name, agency.facebook);
        }
        //if(agency['twitter'].length) {
        //    TwitterAggregator.aggregateData(user.name, agency);
        //}
        //if(agency['instagram'].length) {
        //    InstagramAggregator.aggregateData(user.name, agency);
        //}
        //if(agency['youtube'].length) {
        //    YoutubeAggregator.aggregateData(user.name, agency);
        //}
        //if(agency['socrata'].length) {
        //    SocrataAggregator.aggregateData(user.name, agency);
        //}
        //if(agency['foursquare'].length) {
        //    FoursquareAggregator.aggregateData(user.name, agency);
        //}
        //if(agency['socrata'].length) {
        //    SocrataAggregator.aggregateData(user.name, agency);
        //}
    });
};

exports.extractData = function(user, callback){
    logger.log('info', 'Running data aggregators');
    callback = callback || function() {}; 
    // Aggregate for 1
    if(user) {
        extractDataForUser(user);
        callback();
    }
    // Do them all
    else {
        User.allUsers(function(err, users) {
            // console.log(users);
            _.forEach(users, function(user) {
                console.log("extracting for: " + user.name);
                extractDataForUser(user);
                callback();
            });
        });
    }
}

exports.gatherSearchCriteria = function(userName, agencyName, queryList, platform, callback){
    var criteriaList = queryList["feeds"] || [];
    if(criteriaList.length && _.isArray(criteriaList)) {
        var searchCriteria = {
            tags: [],
            accounts: [],
            url: []
        };

        _.map(criteriaList, function(criteria) {
             var criteriaType = criteria.type;

            if(criteriaType === CRITERIA_TYPE.HASHTAG) {
                searchCriteria.tags.push({
                    "name": criteria.query,
                    "frequency": criteria.frequency !=undefined && criteria.frequency!="" ? criteria.frequency : queryList.frequency
                });
            } else if(criteriaType === CRITERIA_TYPE.ACCOUNT) {
                searchCriteria.accounts.push({
                    "name": criteria.query,
                    "frequency": criteria.frequency !=undefined && criteria.frequency!="" ? criteria.frequency : queryList.frequency
                });
            } else {
                // @todo: make this smarter
                //var arr = criteria.split(CRITERIA_TYPE.URL, 2);
                //searchCriteria.url.push({type: arr[0], url: arr[1]});
            }
        });

        logger.log('debug', 'Gathered search criteria for account: %s, agency: %s, service: %s', [userName, agencyName, platform]);
        return callback(searchCriteria);
    }
}

