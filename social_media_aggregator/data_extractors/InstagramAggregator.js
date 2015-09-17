var express = require('express'),
    request = require('request'),
    async = require('async'),
    api = require('instagram-node').instagram(),
    AggregatorController = require('../AggregatorController'),
    Post = require('../../model/Post'),
    _ = require('lodash'),
    fs = require('fs');

var searchCriteria = {};

exports.aggregateData = function(userName, agency) {
    var $that = this;

    AggregatorController.gatherSearchCriteria(userName, agency, 'instagram', function(criteria){
        searchCriteria = criteria;
        console.log(criteria);

        $that.ensureAuthenticated(function(isAuthenticated){
            console.log(isAuthenticated);
            if(isAuthenticated){
                $that.extractData(userName, agency.name, criteria);
            }
        });
    });
}

exports.ensureAuthenticated = function(callback){
    if(config.apps.instagram.access_token) {
        return callback(true);
    }
    else {
        fs.readFile(__dirname + '/../../config/instagram-config.js', 'utf8', function (err, data) {
            if(err) {
                console.log(err);
                return callback(false);
            }
            console.log(data);
            data = JSON.parse(data);
            config.apps.instagram.access_token = data.access_token;
            return callback(true);
        });
    }
}

exports.extractData = function(userName, agencyName, criteria){
    var profilesTasks = [];
    var tagsTasks = [];
    var $that = this;

    criteria.profiles.forEach(function(profile){
        profilesTasks.push(function(callback){
            logger.log('debug', 'Extracting data from Instagram profile %s', profile);
            $that.getProfileId(profile, function(profileid){
                if(profileid!=undefined){
                    $that.getLastPostId('@' + profile, function(lastPostId){
                        $that.extractProfilePosts(profileid, lastPostId, function(posts){
                            $that.savePosts(userName, agencyName, '@' + profile, posts, callback);
                        });
                    });
                } else {
                    callback();
                }
            });

        });
    });

    criteria.tags.forEach(function(tag){
        tagsTasks.push(function(callback){
            $that.getLastPostId('#' + tag, function(lastPostId){
                $that.extractTagPosts(tag, lastPostId, function(posts){
                    if(posts!=undefined){
                        $that.savePosts(userName, agencyName, '#' + tag, posts, callback);
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

exports.getProfileId = function(profile, callback){
    request({
        url: 'https://api.instagram.com/v1/users/search?q=' + profile + '&access_token=' + config.apps.instagram.access_token,
        method: 'GET'
    }, function(error, response, body) {
        body = JSON.parse(body);
        console.log(body);

        return body.data!=undefined && body.data.length!=0 ? callback(body.data[0].id) : callback(undefined);
    });
}

exports.getLastPostId = function(match, callback){
    Post.getLastPostId('instagram', match, function(lastPostId){
        return callback(lastPostId);
    });
}

exports.extractProfilePosts = function(profileid, lastPostId, callback){
    var url = 'https://api.instagram.com/v1/users/' + profileid + '/media/recent/?access_token=' + config.apps.instagram.access_token
    url += lastPostId!=undefined ? "&min_id=" + lastPostId : "";
    url += "&count=" + config.app.postsLimit;

    request({
        url: url,
        method: 'GET'
    }, function(error, response, body) {
        body = JSON.parse(body);
        console.log("body 2");
        console.log(body);

        return callback(body.data);
    });
}

exports.extractTagPosts = function(tag, lastPostId, callback){
    logger.log('debug', 'Extracting data from Instagram tag %s', tag);
    var url = 'https://api.instagram.com/v1/tags/' + tag + '/media/recent/?access_token=' + config.apps.instagram.access_token
    url += lastPostId!=undefined ? "&min_id=" + lastPostId : "";
    url += "&count=" + config.app.postsLimit;

    request({
        url: url,
        method: 'GET'
    }, function(error, response, body) {
        body = JSON.parse(body);

        return body.data!=undefined && body.data.length!=0 ? callback(body.data) : callback(undefined);
    });
}

exports.savePosts = function(userName, agencyName, match, posts, callback){
    var postsTasks = [];

    posts.forEach(function(postInfo){
        postsTasks.push(function(callback){
            var post = new Post();

            post.userName = userName;
            post.agencyName = agencyName;
            post.id = postInfo.id;
            post.date = new Date(postInfo.created_time * 1000);
            post.date_extracted = new Date();
            post.service = 'instagram';
            post.account = postInfo.user.username;
            post.match = match;
            post.image = _.get(postInfo, 'images.low_resolution.url') || _.get(postInfo, 'images.thumbnail.url');
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