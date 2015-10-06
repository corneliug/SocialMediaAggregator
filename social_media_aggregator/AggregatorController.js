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
    HASHTAG : '#',
    PROFILE : '@',
    URL : '|',
}

exports.startExecution = function(){
    var $that = this;
    $that.extractData();

    setInterval(function(){
        $that.extractData();
    }, config.app.frequency * 1000);
}

var extractDataForUser = function(user) {
    _.forEach(user.agencies, function(agency) {
        // console.log("extracting for agency: ");
        // console.log(agency);
        if(agency['facebook'].length) {
            FacebookAggregator.aggregateData(user.name, agency);
        }
        if(agency['twitter'].length) {
            TwitterAggregator.aggregateData(user.name, agency);
        }
        if(agency['instagram'].length) {
            InstagramAggregator.aggregateData(user.name, agency);
        }
        if(agency['youtube'].length) {
            YoutubeAggregator.aggregateData(user.name, agency);
        }
        if(agency['socrata'].length) {
            SocrataAggregator.aggregateData(user.name, agency);
        }
        if(agency['foursquare'].length) {
            FoursquareAggregator.aggregateData(user.name, agency);
        }
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

exports.gatherSearchCriteria = function(userName, agency, platform, callback){
    var criteriaList = agency[platform] || [];
    if(criteriaList.length && _.isArray(criteriaList)) {
        var searchCriteria = {
            tags: [],
            profiles: [],
            url: []
        };

        _.map(criteriaList, function(criteria) {
             var criteriaType = criteria.substring(0, 1);

            if(criteriaType === CRITERIA_TYPE.HASHTAG) {
                searchCriteria.tags.push(criteria.substring(1, criteria.length));
            } else if(criteriaType === CRITERIA_TYPE.PROFILE) {
                searchCriteria.profiles.push(criteria.substring(1, criteria.length));
            } else {
                // @todo: make this smarter
                var arr = criteria.split(CRITERIA_TYPE.URL, 2);
                searchCriteria.url.push({type: arr[0], url: arr[1]});
            }
        });

        logger.log('debug', 'Gathered search criteria for account: %s, agency: %s, service: %s', [userName, agency.name, platform]);
        return callback(searchCriteria);
    }
}

