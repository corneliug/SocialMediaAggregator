var express = require('express'),
    request = require('request'),
    async = require('async'),
    FB = require('fb'),
    AggregatorController = require('../AggregatorController'),
    Post = require('../../model/Post');

var session = {};
var searchCriteria = {};

var extractedPosts = [];
var bufferedPages = [];
var bufferedPagesInExec = [];

exports.aggregateData = function(userName, agency) {
    var $that = this;

    AggregatorController.gatherSearchCriteria(userName, agency, 'facebook', function(criteria){
        searchCriteria = criteria;

        $that.extractData(userName, agency.name, criteria);
    });
}

exports.authenticate = function(callback){
    FB.api('oauth/access_token', {
        client_id: config.apps.facebook.key,
        client_secret: config.apps.facebook.secret,
        grant_type: 'client_credentials'
    }, function (res) {
        logger.log('debug',"Authentication to Facebook was successful!");

        session.access_token    = res.access_token;
        session.expires         = new Date().getTime() + (res.expires || 0) * 1000;

        return callback();
    });

}

exports.ensureAuthenticated = function(callback){
    var $that = this;
    this.isSessionValid(function(sessionValid){
        if(sessionValid){
            return callback();
        } else {
            logger.log('debug',"Facebook session not valid");
            $that.authenticate(function(){
                return callback();
            });
        }
    });
}

exports.isSessionValid = function(callback){
    var $that = this;
    var accessTokenNotExpired = session.access_token!=null && new Date().getTime() - session.expires > 0;
    if(accessTokenNotExpired){
        FB.api('facebook?access_token=' + session.access_token, function (res) {
            if(!res || res.error) {
                return callback(false);
            }

            return callback(true);
        });
    } else {
        return callback(false);
    }
}

exports.extractData = function(userName, agencyName, criteria){
    var $that = this;

    $that.ensureAuthenticated(function(){
        logger.log('debug',"Extracting data from Facebook...");
        var asyncTasks = [];

        criteria.profiles.forEach(function(profile){
            console.log(profile);
            asyncTasks.push(function(callback){
                $that.extractProfilePosts(userName, agencyName, profile, callback);
            });
        });

        async.parallel(asyncTasks, function(){
            if(asyncTasks.length < config.app.postLimit) {
                $that.extractPostsFromBufferedPages();
            }
        });

    })
}

exports.extractProfilePosts = function(userName, agencyName, profile, callback){
    logger.log('debug',"Extracting data from Facebook profile %s", profile);

    var $that = this;

    $that.getLastPostTime('@' + profile, function(lastPostTime){

        $that.extractPostsInfo(userName, agencyName, profile, lastPostTime, function(){

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
exports.extractPostsInfo = function(userName, agencyName, profile, lastPostTime, callback){
    var $that = this;
    var url = profile + '/posts?fields=id,message,picture,full_picture,created_time,icon,link';
    url += '&access_token=' + session.access_token;
    url += lastPostTime!=undefined ? "&since=" + lastPostTime : "";
    url += "&limit=" + config.app.postsLimit;

    FB.api(url, function (res) {
        if(!res || res.error) {
            $that.handleError(res.error.code, res.error.message, function(){
                return $that.extractPostsInfo(userName, agencyName, profile, lastPostTime, callback);
            });
        }

        if(res!=undefined && res.data!=undefined && res.data.length!=0){
            for(var i in res.data){
                var entry = res.data[i];

                entry.service = "facebook";
                entry.profile = profile;
                entry.match = "@" + profile;
                entry.userName = userName;
                entry.agencyName = agencyName;

                extractedPosts.push(entry);
            }

            if(res.paging!=undefined && res.paging.next!=undefined){
                bufferedPages.push({
                    profile: profile,
                    userName: userName,
                    agencyName: agencyName,
                    url: res.paging.next
                });
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

                                $that.savePost(userName, agencyName, post, callback);

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
    var $that = this;

    request({
        uri: bufferedPage.url,
        method: "GET"
    }, function(error, response, body) {
        if(error) {
            $that.handleError(error.code, error.message, function(){
                return $that.extractNextInfo(bufferedPage, callback);
            });
        }

        body = JSON.parse(body);

        if(body!=undefined && body.data!=undefined && body.data.length!=0){
            for(var i in body.data){
                var entry = body.data[i];

                entry.service = "facebook";
                entry.profile = bufferedPage.profile;
                entry.match = "@" + bufferedPage.profile;
                entry.userName = bufferedPage.userName;
                entry.agencyName = bufferedPage.agencyName;
                extractedPosts.push(entry);
            }

            if(body.paging!=undefined && body.paging.next!=undefined){
                bufferedPagesInExec.push({
                    profile: bufferedPage.profile,
                    userName: bufferedPage.userName,
                    agencyName: bufferedPage.agencyName,
                    url: body.paging.next
                });
            }

            return callback();
        }

        return;

    });
}

// extracts likes
exports.extractPostsLikes = function(post, cb){
    var $that = this;

    FB.api(post.id + '/likes?summary=true&access_token=' + session.access_token, function (res) {

        if(!res || res.error) {
            $that.handleError(res.error.code, res.error.message, function(){
                return $that.extractPostsLikes(post, cb);
            });
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
    post.userName = postInfo.userName;
    post.agencyName = postInfo.agencyName;
    post.id = postInfo.id;
    post.date = new Date(postInfo.created_time);
    post.date_extracted = new Date();
    post.service = postInfo.service;
    post.account = postInfo.profile;
    post.match = postInfo.match;
    post.icon = postInfo.icon;
    post.url = postInfo.link;
    post.text = postInfo.message;
    post.likes = postInfo.likes;
    post.image = postInfo.full_picture || postInfo.picture;

    post.save();
    callback();
}

exports.handleError = function(errCode, errMessage, nextAction){
    var $that = this;
    switch (errCode) {
        // access_token expired
        case 102: {
            $that.errorHandlers.handleExpiredToken(errCode, nextAction);
        }

        // access_token expired
        case 104: {
            $that.errorHandlers.handleExpiredToken(errCode, nextAction);
        }

        // access_token expired
        case 190: {
            $that.errorHandlers.handleExpiredToken(errCode, nextAction);
        }

        // access_token expired
        case 463: {
            $that.errorHandlers.handleExpiredToken(errCode, nextAction);
        }

        // access_token expired
        case 467: {
            $that.errorHandlers.handleExpiredToken(errCode, nextAction);
        }

        // OAuthException
        case 190: {
            $that.errorHandlers.handleExpiredToken(errCode, nextAction);
        }

        // OAuthException
        case 191: {
            logger.log('info',"Error %s occurred: %s",errCode, errMessage);
            return ;
        }

        // Bad search key
        case 803: {
            logger.log('info', errMessage);
            return ;
        }

        default: {
            logger.log('info',"Failed to handle error %s: %s", errCode, errMessage);
        }
    }
}


var $that = this;

exports.errorHandlers = {
    handleExpiredToken: function(errCode, nextAction){
        logger.log('info',"%s: handling expired access_token", errCode);
        $that.authenticate(nextAction);
    }
}