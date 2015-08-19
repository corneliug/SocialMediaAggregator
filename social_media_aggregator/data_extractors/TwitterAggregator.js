var express = require('express'),
    request = require('request'),
    async = require('async'),
    btoa = require('btoa'),
    AggregatorController = require('../AggregatorController'),
    Post = require('../../model/Post');

var session = {};
var searchCriteria = {};

var CRITERIA_TYPE = {
    HASHTAG : '#',
    PROFILE : '@'
}

var extractedPosts = [];

exports.aggregateData = function() {
    var $that = this;

    AggregatorController.gatherSearchCriteria(AggregatorController.PLATFORMS.TWITTER, function(criteria){
        searchCriteria = criteria;

        $that.authenticate(function(){
            $that.extractData();
        });
    });
}

exports.authenticate = function(callback){
    var encodedAuth = 'Basic ' + btoa(credentials.apps.twitter.key + ":" + credentials.apps.twitter.secret);
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
        body = JSON.parse(body);
        session.access_token = 'Bearer ' + body.access_token;

        return callback();
    });
}

exports.extractData = function(){
    var $that = this;
    var profilesTasks = [];
    var tagsTasks = [];

    searchCriteria.profiles.forEach(function(profile){
        profilesTasks.push(function(callback){
            $that.getLastPostId(profile, function(lastPostId){
                $that.extractProfilePosts(profile, lastPostId, function(posts){
                    $that.saveProfilePosts(profile, posts, callback);
                });
            });
        });
    });

    searchCriteria.tags.forEach(function(tag){
        tagsTasks.push(function(callback){
            $that.getLastPostId(tag, function(lastPostId){
                $that.extractTagPosts(tag, lastPostId, function(posts){
                    $that.saveTagsPosts(tag, posts, callback);
                });
            });
        });
    });

    //async.parallel(profilesTasks, function(){
    //});

    async.parallel(tagsTasks, function(){
    });
}

exports.getLastPostId = function(match, callback){
    Post.getLastPostId('twitter', '@' + match, function(lastPostId){
        return callback(lastPostId);
    });
}

exports.extractTagPosts = function(tag, lastPostId, callback){
    console.log("Extracting data from Twitter tag " + tag);

    var url = 'https://api.twitter.com/1.1/search/tweets.json?q=%23' + tag;
    url += lastPostId!=undefined ? "&since_id=" + lastPostId : "&count=20";
    url += "&result_type=recent";

    request({
        url: url,
        method: 'GET',
        headers: {
            'Authorization': session.access_token
        }
    }, function(error, response, body) {
        body = JSON.parse(body);

        console.log(body.statuses);

        return callback(body.statuses);
    });
}

exports.extractProfilePosts = function(profile, lastPostId, callback){
    console.log("Extracting data from Twitter profile " + profile);

    var url = 'https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=' + profile;
    url += lastPostId!=undefined ? "&since_id=" + lastPostId : "&count=20";

    request({
        url: url,
        method: 'GET',
        headers: {
            'Authorization': session.access_token
        }
    }, function(error, response, body) {
        body = JSON.parse(body);

        return callback(body);
    });
}

exports.saveProfilePosts = function(profile, posts, callback){
    var postsTasks = [];

    posts.forEach(function(postInfo){
        postsTasks.push(function(callback){

            var post = new Post();

            post.id = postInfo.id_str;
            post.date = new Date(postInfo.created_at);
            post.service = 'twitter';
            post.account = profile;
            post.match = '@' + profile;
            post.text = postInfo.text;
            post.likes = postInfo.retweet_count;
            post.url = 'https://twitter.com/' + profile + '/status/' + postInfo.id_str;
            post.icon = postInfo.profile_image_url;

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

                post.id = postInfo.id_str;
                post.date = new Date(postInfo.created_at);
                post.service = 'twitter';
                post.match = '#' + tag;
                post.text = postInfo.text;
                post.likes = postInfo.retweet_count;
                post.account = postInfo.user.screen_name;
                post.url = 'https://twitter.com/' + post.account + '/status/' + postInfo.id_str;
                post.icon = postInfo.user.profile_image_url;

                post.save();
                callback();
            }
        });
    });

    async.parallel(tagsTasks, function(){
        callback();
    });
}