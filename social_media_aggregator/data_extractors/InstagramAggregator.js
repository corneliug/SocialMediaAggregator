var express = require('express'),
    request = require('request'),
    async = require('async'),
    api = require('instagram-node').instagram(),
    AggregatorController = require('../AggregatorController'),
    Post = require('../../model/Post');

var searchCriteria = {};

exports.aggregateData = function() {
    var $that = this;

    AggregatorController.gatherSearchCriteria(AggregatorController.PLATFORMS.INSTAGRAM, function(criteria){
        searchCriteria = criteria;

        $that.ensureAuthenticated(function(){
            $that.extractData();
        });
    });
}

exports.ensureAuthenticated = function(callback){
    return callback();
}

exports.extractData = function(){
    var profilesTasks = [];
    var tagsTasks = [];
    var $that = this;

    searchCriteria.profiles.forEach(function(profile){
        profilesTasks.push(function(callback){

            $that.getProfileId(profile, function(profileid){
                $that.getLastPostId('@' + profile, function(lastPostId){
                    $that.extractProfilePosts(profileid, lastPostId, function(posts){
                        $that.savePosts('@' + profile, posts, callback);
                    });
                });
            });

        });
    });

    searchCriteria.tags.forEach(function(tag){
        tagsTasks.push(function(callback){
            $that.getLastPostId('#' + tag, function(lastPostId){
                $that.extractTagPosts(tag, lastPostId, function(posts){
                    $that.savePosts('#' + tag, posts, callback);
                });
            });
        });
    });

    async.parallel(profilesTasks, function(){
    });

    async.parallel(tagsTasks, function(){
    });
}

exports.getProfileId = function(profile, callback){
    request({
        url: 'https://api.instagram.com/v1/users/search?q=' + profile + '&access_token=' + sessions.instagram,
        method: 'GET'
    }, function(error, response, body) {
        body = JSON.parse(body);

        return callback(body.data[0].id);
    });
}

exports.getLastPostId = function(match, callback){
    Post.getLastPostId('instagram', match, function(lastPostId){
        return callback(lastPostId);
    });
}

exports.extractProfilePosts = function(profileid, lastPostId, callback){
    var url = 'https://api.instagram.com/v1/users/' + profileid + '/media/recent/?access_token=' + sessions.instagram
    url += lastPostId!=undefined ? "&min_id=" + lastPostId : "&count=" + config.app.frequency;

    request({
        url: url,
        method: 'GET'
    }, function(error, response, body) {
        body = JSON.parse(body);

        return callback(body.data);
    });
}

exports.extractTagPosts = function(tag, lastPostId, callback){
    var url = 'https://api.instagram.com/v1/tags/' + tag + '/media/recent/?access_token=' + sessions.instagram
    url += lastPostId!=undefined ? "&min_id=" + lastPostId : "&count=" + config.app.frequency;

    request({
        url: url,
        method: 'GET'
    }, function(error, response, body) {
        body = JSON.parse(body);

        return callback(body.data);
    });
}

exports.savePosts = function(match, posts, callback){
    var postsTasks = [];

    posts.forEach(function(postInfo){
        postsTasks.push(function(callback){

            var post = new Post();

            post.id = postInfo.id;
            post.date = new Date(postInfo.created_time + "000");
            post.service = 'instagram';
            post.account = postInfo.user.username;
            post.match = match;
            post.text = postInfo.caption!=null && postInfo.caption.text!=null ? postInfo.caption.text : "";
            post.likes = postInfo.likes!=undefined && postInfo.likes.count!=undefined ? postInfo.likes.count : 0;
            post.url = postInfo.link;
            post.icon = postInfo.user.profile_picture;

            post.save();
            callback();
        });
    });

    async.parallel(postsTasks, function(){
        callback();
    });
}