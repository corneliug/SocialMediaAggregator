var express            = require('express'),
    FacebookAggregator = require('./data_extractors/FacebookAggregator'),
    TwitterAggregator = require('./data_extractors/TwitterAggregator'),
    InstagramAggregator = require('./data_extractors/InstagramAggregator'),
    credentials = require("../config/credentials.js");

var CRITERIA_TYPE = {
    HASHTAG : '#',
    PROFILE : '@'
}

exports.PLATFORMS = {
    FACEBOOK: {
        NAME: 'Facebook',
        CRITERIA: credentials.accounts.facebook
    },
    TWITTER: {
        NAME: 'Twitter',
        CRITERIA: credentials.accounts.twitter
    },
    INSTAGRAM: {
        NAME: 'Instagram',
        CRITERIA: credentials.accounts.instagram
    },
    YOUTUBE: {
        NAME: 'Youtube',
        CRITERIA: credentials.accounts.youtube
    }
}

exports.startExecution = function(){
    FacebookAggregator.aggregateData();
    TwitterAggregator.aggregateData();
    //InstagramAggregator.aggregateData();
}

exports.gatherSearchCriteria = function(platform, callback){
    var criteriaList = platform.CRITERIA;
    var searchCriteria = {
        tags: [],
        profiles: []
    };

    for(var index in criteriaList) {
        var criteria = criteriaList[index];
        var criteriaType = criteria.substring(0, 1);

        if(criteriaType === CRITERIA_TYPE.HASHTAG) {
            searchCriteria.tags.push(criteria.substring(1, criteria.length));
        } else if(criteriaType === CRITERIA_TYPE.PROFILE) {
            searchCriteria.profiles.push(criteria.substring(1, criteria.length));
        }
    }

    console.log("Gathered search criteria for " + platform.NAME + " ...");
    return callback(searchCriteria);
}

