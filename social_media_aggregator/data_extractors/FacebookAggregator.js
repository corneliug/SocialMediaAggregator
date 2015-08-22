var express = require('express'),
    request = require('request'),
    async = require('async'),
    FB = require('fb'),
    AggregatorController = require('../AggregatorController'),
    Post = require('../../model/Post');

var session = {};
var searchCriteria = {};

var CRITERIA_TYPE = {
    HASHTAG : '#',
    PROFILE : '@'
}

var extractedPosts = [];
var bufferedPages = [];
var bufferedPagesInExec = [];

exports.gatherSearchCriteria = function(callback){
    var criteriaList = config.accounts.facebook;

    for(var index in criteriaList) {
        var criteria = criteriaList[index];
        var criteriaType = criteria.substring(0, 1);

        if(criteriaType === CRITERIA_TYPE.HASHTAG) {
            searchCriteria.tags.push(criteria.substring(1, criteria.length));
        } else if(criteriaType === CRITERIA_TYPE.PROFILE) {
            searchCriteria.profiles.push(criteria.substring(1, criteria.length));
        }
    }

    console.log("Gathered search criteria for Facebook...");
    return callback;
}

exports.aggregateData = function() {
    var $that = this;

    AggregatorController.gatherSearchCriteria(AggregatorController.PLATFORMS.FACEBOOK, function(criteria){
        searchCriteria = criteria;

        $that.extractData();
    });
}

exports.authenticate = function(callback){
    FB.api('oauth/access_token', {
        client_id: config.apps.facebook.key,
        client_secret: config.apps.facebook.secret,
        grant_type: 'client_config'
    }, function (res) {
        if(!res || res.error) {
            console.log(!res ? 'error occurred' : res.error);
            return;
        }
        console.log("Authentication to Facebook was successful!");

        session.access_token    = res.access_token;
        session.expires         = new Date().getTime() + (res.expires || 0) * 1000;

        return callback();
    });

}

exports.ensureAuthenticated = function(callback){
    if(this.isSessionValid()){
        return callback();
    } else {
        console.log("Facebook session not valid");
        this.authenticate(function(){
            return callback();
        });
    }
}

exports.isSessionValid = function(){
    return session.access_token!=null && new Date().getTime() - session.expires > 0;
}

exports.extractData = function(){
    var $that = this;

    $that.ensureAuthenticated(function(){
        console.log("Extracting data from Facebook...");
        var asyncTasks = [];

        searchCriteria.profiles.forEach(function(profile){
            asyncTasks.push(function(callback){
                $that.extractProfilePosts(profile, callback);
            });
        });

        async.parallel(asyncTasks, function(){
            $that.extractPostsFromBufferedPages();
        });

    })
}

exports.extractProfilePosts = function(profile, callback){
    console.log("Extracting data from Facebook profile " + profile);

    var $that = this;

    $that.getLastPostTime('@' + profile, function(lastPostTime){

        $that.extractPostsInfo(profile, lastPostTime, function(){

            var asyncTasks = [];

            extractedPosts.forEach(function(post){

                asyncTasks.push(function(callback){

                    $that.extractPostsLikes(post, function(post){

                        $that.savePost(post, callback);

                    });

                });
            });

            async.parallel(asyncTasks, function(){
                callback();
            });

        });
    });

}

// will query the db to get the laast post datetime for a profile
exports.getLastPostTime = function(match, callback){
    Post.getLastPostTime('facebook', match, function(lastPostTime){
        return callback(lastPostTime);
    });
}

// extracts id, message, creted_time, icon, link
exports.extractPostsInfo = function(profile, lastPostTime, callback){
    var $that = this;
    var url = profile + '/posts?access_token=' + session.access_token
        + "&fields=id,message,created_time,icon,link";

    url += lastPostTime!=undefined ? "&since=" + lastPostTime : "&limit=20";

    FB.api(url, function (res) {

            if(!res || res.error) {
                console.log(!res ? 'error occurred' : res.error);
                return;
            }

            if(res!=undefined && res.data!=undefined && res.data.length!=0){
                for(var i in res.data){
                    var entry = res.data[i];

                    entry.service = "facebook";
                    entry.profile = profile;
                    entry.account = "@" + profile;
                    entry.match = "@" + profile;

                    extractedPosts.push(entry);
                }

                if(res.paging!=undefined && res.paging.next!=undefined){
                    bufferedPages.push({profile: profile, url: res.paging.next});
                }

                return callback();
            }

            return;

    });
}

exports.extractPostsFromBufferedPages = function(){
    var $that = this;

    if(bufferedPages.length!=0){
        bufferedPagesInExec = [];
        extractedPosts = [];

        var bufferedPagesTasks = [];

        bufferedPages.forEach(function(bufferedPage){
            bufferedPagesTasks.push(function(callback){

                $that.extractNextInfo(bufferedPage, function(){
                    var asyncTasks = [];

                    extractedPosts.forEach(function(post){

                        asyncTasks.push(function(callback){

                            $that.extractPostsLikes(post, function(post){

                                $that.savePost(post, callback);

                            });

                        });
                    });

                    async.parallel(asyncTasks, function(){
                        callback();
                    });

                });

            });
        });

        async.parallel(bufferedPagesTasks, function(){

            bufferedPages = [];
            $that.extractPostsFromBufferedPages();

        });
    }
}

exports.extractNextInfo = function(bufferedPage, callback){
    request({
        uri: bufferedPage.url,
        method: "GET"
    }, function(error, response, body) {
        body = JSON.parse(body);

        if(body!=undefined && body.data!=undefined && body.data.length!=0){
            for(var i in body.data){
                var entry = body.data[i];

                entry.service = "facebook";
                entry.profile = bufferedPage.profile;
                entry.account = bufferedPage.profile;
                entry.match = "@" + bufferedPage.profile;

                extractedPosts.push(entry);
            }

            if(body.paging!=undefined && body.paging.next!=undefined){
                bufferedPagesInExec.push({profile: bufferedPage.profile, url: body.paging.next});
            }

            return callback();
        }

        return;

    });
}

// extracts likes
exports.extractPostsLikes = function(post, cb){
    var $that = this;

    FB.api(post.id + '/likes?access_token=' + session.access_token
        + "&summary=true", function (res) {

        if(!res || res.error) {
            console.log(!res ? 'error occurred' : res.error);
            return;
        }

        if(res!=undefined && res.summary!=undefined){
            post.likes = res.summary.total_count;
        }

        return cb(post);
    });

}

// saves the post into the db
exports.savePost = function(postInfo, callback) {
    var post = new Post();

    post.id = postInfo.id;
    post.date = new Date(postInfo.created_time);
    post.service = postInfo.service;
    post.account = postInfo.account;
    post.match = postInfo.match;
    post.icon = postInfo.icon;
    post.url = postInfo.link;
    post.text = postInfo.message;
    post.likes = postInfo.likes;

    post.save();
    callback();
}