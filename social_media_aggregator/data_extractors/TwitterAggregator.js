var express = require('express'),
    request = require('request'),
    async = require('async'),
    btoa = require('btoa'),
    AggregatorController = require('../AggregatorController'),
    _ = require('lodash'),
    Post = require('../../model/Post');

var session = {};
var searchCriteria = {};

exports.aggregateData = function(userName, agency) {
    var $that = this;

    AggregatorController.gatherSearchCriteria(userName, agency, 'twitter', function(criteria){
        searchCriteria = criteria;

        $that.authenticate(function(){
            $that.extractData(userName, agency.name, criteria);
        });
    });
}

exports.authenticate = function(callback){
    var encodedAuth = 'Basic ' + btoa(config.apps.twitter.key + ":" + process.env.TWITTER_SECRET);

    var formData = {
        grant_type: 'client_credentials'
    }

    request({
        url: 'https://api.twitter.com/oauth2/token',
        method: 'POST',
        headers: {
            'Authorization': encodedAuth,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        formData: formData
    }, function(error, response, body) {
        logger.log('info', 'Twitter authentication response: %s', body);
        body = JSON.parse(body);
        session.access_token = 'Bearer ' + body.access_token;

        logger.log('debug',"Authentication to Twitter was successful!");
        return callback();
    });
}

exports.extractData = function(userName, agencyName, criteria){
    logger.log('debug','Extracting data from Twitter...');
    var $that = this;
    var profilesTasks = [];
    var tagsTasks = [];

    criteria.profiles.forEach(function(profile){
        profilesTasks.push(function(callback){
            $that.getLastPostId('@' + profile, function(lastPostId){
                logger.log('debug','Extracting data from Twitter profile %s', profile);
                $that.extractProfilePosts(userName, agencyName, profile, lastPostId, function(posts){
                    if(posts!=undefined){
                        $that.saveProfilePosts(profile, posts, callback);
                    } else {
                        callback();
                    }
                });
            });
        });
    });

    criteria.tags.forEach(function(tag){
        tagsTasks.push(function(callback){
            $that.getLastPostId('#' + tag, function(lastPostId){
                $that.extractTagPosts(userName, agencyName, tag, lastPostId, function(posts){
                    if(posts!=undefined){
                        $that.saveTagsPosts(tag, posts, callback);
                    } else {
                        callback();
                    }
                });
            });
        });
    });

    async.parallel(profilesTasks, function(){
    });

    async.parallel(tagsTasks, function(){
    });
}

exports.getLastPostId = function(match, callback){
    Post.getLastPostId('twitter', match, function(lastPostId){
        return callback(lastPostId);
    });
}

exports.extractTagPosts = function(userName, agencyName, tag, lastPostId, callback){
    logger.log('debug', "Extracting data from Twitter tag %s", tag);

    var url = 'https://api.twitter.com/1.1/search/tweets.json?q=%23' + tag;
    url += lastPostId!=undefined ? "&since_id=" + lastPostId : "";
    url += "&count=" + config.app.postsLimit + "&result_type=recent";

    (function(callData) {
        request({
            url: url,
            method: 'GET',
            headers: {
                'Authorization': session.access_token
            }
        }, function(error, response, body) {
            body = JSON.parse(body);
            _.forEach(body.statuses, function(post, key) {
                if(_.has(post, 'entities')) {
                    body.statuses[key].userName = callData.userName;
                    body.statuses[key].agencyName = callData.agencyName;
                }
            });

            return body.statuses!=undefined && body.statuses.length!=0 ? callback(body.statuses) : callback(undefined);
        })
    })({userName: userName, agencyName: agencyName});
}

exports.extractProfilePosts = function(userName, agencyName, profile, lastPostId, callback){
    logger.log('debug',  "Extracting data from Twitter profile %s", profile);

    var url = 'https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=' + profile;
    url += lastPostId!=undefined ? "&since_id=" + lastPostId : "";
    url += "&count=" + config.app.postsLimit;

    (function(callData) {
        request({
            url: url,
            method: 'GET',
            headers: {
                'Authorization': session.access_token
            }
        }, function(error, response, body) {
            body = JSON.parse(body);
            var hasError = false;

            // handle no results found
            if(body.errors!=undefined && body.errors.length!=undefined){
                for(var i in body.errors){
                    var error = body.errors[i];

                    if(error.code == 34){
                        hasError = true;
                        break;
                    }
                }
            }
            else {
                _.forEach(body, function(post, key) {
                    if(_.has(post, 'entities')) {
                        body[key].userName = callData.userName;
                        body[key].agencyName = callData.agencyName;
                    }
                });
            }

            return hasError ? callback(undefined) : callback(body);
        });
    })({userName: userName, agencyName: agencyName});

}

exports.saveProfilePosts = function(profile, posts, callback){
    var postsTasks = [];

    posts.forEach(function(postInfo){
        postsTasks.push(function(callback){

            var post = new Post();

            post.userName = postInfo.userName;
            post.agencyName = postInfo.agencyName;
            post.id = postInfo.id_str;
            post.date = new Date(postInfo.created_at);
            post.date_extracted = new Date();
            post.service = 'twitter';
            post.account = profile;
            post.match = '@' + profile;
            post.text = postInfo.text;
            post.likes = postInfo.retweet_count;
            post.url = 'https://twitter.com/' + profile + '/status/' + postInfo.id_str;
            post.icon = postInfo.profile_image_url;

            var media = _.get(postInfo, 'entities.media');
            _.forEach(media, function(item) {
                if(_.has(item, 'sizes.small')) {
                    post.image = item.media_url + ':small';
                    return false;
                }
            });
            post.save();
            callback();
        });
    });

    async.parallel(postsTasks, function(){
        callback();
    });
}

exports.saveTagsPosts = function(tag, posts, callback){
    var tagsTasks = [];

    posts.forEach(function(postInfo){
        tagsTasks.push(function(callback){

            if(postInfo.retweet_count!=undefined && postInfo.retweet_count==0){
                var post = new Post();
                
                post.userName = postInfo.userName;
                post.agencyName = postInfo.agencyName;
                post.id = postInfo.id_str;
                post.date = new Date(postInfo.created_at);
                post.date_extracted = new Date();
                post.service = 'twitter';
                post.match = '#' + tag;
                post.text = postInfo.text;
                post.likes = postInfo.retweet_count;
                post.account = postInfo.user.screen_name;
                post.url = 'https://twitter.com/' + post.account + '/status/' + postInfo.id_str;
                post.icon = postInfo.user.profile_image_url;

                var media = _.get(postInfo, 'entities.media');
                _.forEach(media, function(item) {
                    if(_.has(item, 'sizes.small')) {
                        post.image = item.media_url + ':small';
                        return false;
                    }
                });
                
                post.save();
                callback();
            }
        });
    });

    async.parallel(tagsTasks, function(){
        callback();
    });
}