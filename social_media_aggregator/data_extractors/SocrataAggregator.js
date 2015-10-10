var express = require('express'),
    request = require('request'),
    async = require('async'),
    AggregatorController = require('../AggregatorController'),
    Post = require('../../model/Post'),
    _ = require('lodash'),
    fs = require('fs');

var searchCriteria = {};

exports.aggregateData = function(userName, agency) {
    var $that = this;

    AggregatorController.gatherSearchCriteria(userName, agency, 'socrata', function(criteria){
        searchCriteria = criteria;
        console.log(criteria)

        //$that.ensureAuthenticated(function(isAuthenticated){
        //    if(isAuthenticated){
                $that.extractData(userName, agency.name, criteria);
        //    }
        //});
    });
}

/*exports.ensureAuthenticated = function(callback){
    if(config.apps.instagram.access_token) {
        return callback(true);
    }
    else {
        fs.readFile(__dirname + '/../../config/instagram-config.js', 'utf8', function (err, data) {
            if(err) {
                console.log(err);
                return callback(false);
            }
            data = JSON.parse(data);
            config.apps.instagram.access_token = data.access_token;
            return callback(true);
        });
    }
}
*/

exports.extractData = function(userName, agencyName, criteria){
    var urlTasks = [];
    var $that = this;

    criteria.url.forEach(function(query){
        urlTasks.push(function(callback){
            logger.log('debug', 'Extracting data from Socrata query %s', query);
            /*$that.getQueryId(query, function(queryid){
                if(queryid!=undefined){
                    $that.getLastPostId(query.type, function(lastPostId){
                        $that.extractUrlPosts(queryid, lastPostId, function(posts){
                            $that.savePosts(userName, agencyName, '@' + query, posts, callback);
                        });
                    });
                } else {
                    callback();
                }
            });*/
            $that.getLastPostDate(query.type, function(lastPostDate){
                $that.extractUrlPosts(query, lastPostDate, function(posts){
                    $that.savePosts(userName, agencyName, query.type, posts, callback);
                });
            });

        });
    });

    /*criteria.url.forEach(function(tag){
        urlTasks.push(function(callback){
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
    });*/

    async.parallel(urlTasks, function(){
    });
}

/*
exports.getQueryId = function(query, callback){
    request({
        url: query.url,
        method: 'GET'
    }, function(error, response, body) {
        if(error || !body || !response) {
            return callback(undefined);
        }
        else {
            body = JSON.parse(body);

            return body.data!=undefined && body.data.length!=0 ? callback(body.data[0].id) : callback(undefined);
        }
    });
}
*/

exports.getLastPostDate = function(match, callback){
    Post.find({
        service: 'socrata',
        match: match
    }).sort({
        date: -1
    }).exec(function (err, posts) {
        return posts.length!=0 ? callback(posts[0].date) : callback(undefined);
    });
}

exports.extractUrlPosts = function(query, lastPostDate, callback){
    var url = query.url;
    // @todo: url += lastPostDate!=undefined ? "&$where=datetime > " + lastPostDate.toISOString() : "";
    //url += "&count=" + config.app.postsLimit;

    request({
        url: url,
        method: 'GET'
    }, function(error, response, body) {
        if(error || !body || !response) {
            return callback(undefined);
        }
        else {
            body = JSON.parse(body);

            return callback(body);
        }
    });
}

exports.savePosts = function(userName, agencyName, match, posts, callback){
    var postsTasks = [];

    posts.forEach(function(postInfo){
        postsTasks.push(function(callback){
            var post = new Post();

            post.userName = userName;
            post.agencyName = agencyName;
            post.id = postInfo.casenumber;
            post.date = new Date(postInfo.datetime);
            post.date_extracted = new Date();
            post.service = 'socrata';
            //post.account = postInfo.user.username;
            post.match = match;
            //post.image = _.get(postInfo, 'images.low_resolution.url') || _.get(postInfo, 'images.thumbnail.url');
            post.text = postInfo.description;
            post.likes = 0;
            post.loc = {
                type : "Point",
                coordinates : [parseFloat(postInfo.location_1.longitude), parseFloat(postInfo.location_1.latitude)],
                address: postInfo.location_1.human_address
            }

            //post.url = postInfo.link;
            //post.icon = postInfo.user.query_picture;
            post.save();
            callback();
        });
    });



    async.parallel(postsTasks, function(){
        callback();
    });
}