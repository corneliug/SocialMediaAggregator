var express            = require('express'),
    FacebookAggregator = require('./data_extractors/FacebookAggregator'),
    TwitterAggregator = require('./data_extractors/TwitterAggregator'),
    InstagramAggregator = require('./data_extractors/InstagramAggregator'),
    YoutubeAggregator = require('./data_extractors/YoutubeAggregator'),
    SocrataAggregator = require('./data_extractors/SocrataAggregator'),
    FoursquareAggregator = require('./data_extractors/FoursquareAggregator'),
    SeeClickFixAggregator = require('./data_extractors/SeeClickFixAggregator'),
    RSSAggregator = require('./data_extractors/RSSAggregator'),
    ICalendarAggregator = require('./data_extractors/ICalendarAggregator'),
    YelpAggregator = require('./data_extractors/YelpAggregator'),
    GtfsAggregator = require('./data_extractors/GtfsAggregator'),
    ElectionPollingAggregator = require('./data_extractors/ElectionPollingAggregator'),
    config = require("../config/config.js"),
    _ = require('lodash'),
    User = require('../model/User');

var CRITERIA_TYPE = {
    HASHTAG : 'hashtag',
    ACCOUNT : 'account'
}

exports.startExecution = function(){
    var $that = this;
    $that.extractData();

    setInterval(function(){
        $that.extractData();
    }, config.app.frequency * 1000);
}

exports.runWithTimeout = function(timeout, authenticate, execute){
    setInterval(function(){
        if(authenticate!=null){
            authenticate(function(){
                execute();
            });
        } else {
            execute();
        }
    }, timeout * 1000);
}

var extractDataForUser = function(user) {
    _.forEach(user.agencies, function(agency) {
        if(agency.facebook["feeds"].length) {
            FacebookAggregator.aggregateData(user.name, agency);
        }

        if(agency.twitter["feeds"].length) {
            TwitterAggregator.aggregateData(user.name, agency);
        }

        if(agency.instagram['feeds'].length) {
            InstagramAggregator.aggregateData(user.name, agency);
        }

        if(agency.youtube['feeds'].length) {
            YoutubeAggregator.aggregateData(user.name, agency);
        }
        if(agency.socrata['feeds'].length) {
            SocrataAggregator.aggregateData(user.name, agency);
        }

        if(agency.foursquare['feeds'].length) {
            FoursquareAggregator.aggregateData(user, agency);
        }

         if(agency.seeclickfix['feeds'].length) {
             SeeClickFixAggregator.aggregateData(user, agency);
        }

         if(agency.rss['feeds'].length) {
             RSSAggregator.aggregateData(user, agency);
        }

         if(agency.ical['feeds'].length) {
             ICalendarAggregator.aggregateData(user, agency);
        }

        if(agency.yelp['feeds'].length) {
             YelpAggregator.aggregateData(user, agency);
        }

        if(agency.gtfs['feeds'].length) {
             GtfsAggregator.aggregateData(user, agency);
        }

        //if(agency.election['feeds'].length) {
        //    ElectionPollingAggregator.aggregateData(user, agency);
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
            }
        });

        logger.log('debug', 'Gathered search criteria for account: %s, agency: %s, service: %s', [userName, agencyName, platform]);
        return callback(searchCriteria);
    }
}

