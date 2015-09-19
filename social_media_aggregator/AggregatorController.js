var express            = require('express'),
    FacebookAggregator = require('./data_extractors/FacebookAggregator'),
    TwitterAggregator = require('./data_extractors/TwitterAggregator'),
    InstagramAggregator = require('./data_extractors/InstagramAggregator'),
    YoutubeAggregator = require('./data_extractors/YoutubeAggregator'),
    config = require("../config/config.js"),
    _ = require('lodash'),
    User = require('../model/User');

var CRITERIA_TYPE = {
    HASHTAG : '#',
    PROFILE : '@'
}

exports.startExecution = function(){
    var $that = this;
    $that.extractData();

    // setInterval(function(){
    //     $that.extractData();
    // }, config.app.frequency * 1000);
}

var extractDataForUser = function(user) {
    _.forEach(user.agencies, function(agency) {
        // console.log("extracting for agency: ");
        // console.log(agency);
        FacebookAggregator.aggregateData(user.name, agency);
        TwitterAggregator.aggregateData(user.name, agency);
        InstagramAggregator.aggregateData(user.name, agency);
        YoutubeAggregator.aggregateData(user.name, agency);
    });
};

exports.extractData = function(user){
    logger.log('info', 'Running data aggregators');

    // Aggregate for 1
    if(user) {
        extractDataForUser(user);
    }
    // Do them all
    else {
        User.allUsers(function(err, users) {
            // console.log(users);
            _.forEach(users, function(user) {
                console.log("extracting for: " + user.name);
                extractDataForUser(user);
            });
        });
    }
}

exports.gatherSearchCriteria = function(userName, agency, platform, callback){
    var criteriaList = agency[platform] || [];
    if(criteriaList.length && _.isArray(criteriaList)) {
        var searchCriteria = {
            tags: [],
            profiles: []
        };

        _.map(criteriaList, function(criteria) {
             var criteriaType = criteria.substring(0, 1);

            if(criteriaType === CRITERIA_TYPE.HASHTAG) {
                searchCriteria.tags.push(criteria.substring(1, criteria.length));
            } else if(criteriaType === CRITERIA_TYPE.PROFILE) {
                searchCriteria.profiles.push(criteria.substring(1, criteria.length));
            }
        });

        logger.log('debug', 'Gathered search criteria for account: %s, agency: %s, service: %s', [userName, agency.name, platform]);
        return callback(searchCriteria);
    }
}

