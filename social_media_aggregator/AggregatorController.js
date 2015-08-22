var express            = require('express'),
    FacebookAggregator = require('./data_extractors/FacebookAggregator'),
    TwitterAggregator = require('./data_extractors/TwitterAggregator'),
    InstagramAggregator = require('./data_extractors/InstagramAggregator'),
    YoutubeAggregator = require('./data_extractors/YoutubeAggregator'),
    config = require("../config/config.js");

var CRITERIA_TYPE = {
    HASHTAG : '#',
    PROFILE : '@'
}

exports.PLATFORMS = {
    FACEBOOK: {
        NAME: 'Facebook',
        CRITERIA: config.accounts.facebook
    },
    TWITTER: {
        NAME: 'Twitter',
        CRITERIA: config.accounts.twitter
    },
    INSTAGRAM: {
        NAME: 'Instagram',
        CRITERIA: config.accounts.instagram
    },
    YOUTUBE: {
        NAME: 'Youtube',
        CRITERIA: config.accounts.youtube
    }
}

exports.startExecution = function(){
    //FacebookAggregator.aggregateData();
    //TwitterAggregator.aggregateData();
    //InstagramAggregator.aggregateData();
    YoutubeAggregator.aggregateData();
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

