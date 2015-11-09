var express = require('express'),
    request = require('request'),
    async = require('async'),
    AggregatorController = require('../AggregatorController'),
    Post = require('../../model/Post'),
    _ = require('lodash'),
    fs = require('fs');

exports.aggregateData = function(user, agency) {
    var $that = this;

    AggregatorController.runWithTimeout(agency.seeclickfix.frequency, null, function(){
        $that.proceedIfParamsAreValid(user, function(){
            $that.extractData(user, agency);
        });
    });
}

exports.extractData = function(user, agency){
    var tasks = [];
    var $that = this;

    agency.seeclickfix['feeds'].forEach(function(query){
        tasks.push(function(callback){

            $that.getLastPostDate(query.status, function(lastPostDate){
                $that.extract311Posts(agency.seeclickfix, query.status, user, lastPostDate, function(posts){
                    $that.savePosts(user.name, 'seeclickfix', query.status, posts, callback);
                });
            });

        });
    });

    async.parallel(tasks, function(){
    });
}

exports.getLastPostDate = function(match, callback){
    Post.find({
        service: 'seeclickfix',
        match: match
    }).sort({
        date: -1
    }).exec(function (err, posts) {
        return posts.length!=0 ? callback(posts[0].date) : callback(undefined);
    });
}

exports.extract311Posts = function(agency, status, user, lastPostDate, callback){
    var defaultDate = new Date();
    defaultDate.setMonth(defaultDate.getMonth() - 3);

    var url = "https://seeclickfix.com/open311/v2/requests.json?";
    url += "lat=" + user.lat + "&long=" + user.lng;
    url += "&zoom=" + agency.zoom + "&per_page=" + agency.per_page + "&sort=start_date&status=" + status;
    url += lastPostDate!=undefined ? "&start_date=" + lastPostDate.toISOString() : "&start_date=" + defaultDate.toISOString();

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

    if(posts!=undefined && posts.length!=0){
        var postsTasks = [];

        posts.forEach(function(postInfo){
            postsTasks.push(function(callback){
                var post = new Post();

                post.userName = userName;
                post.agencyName = agencyName;
                post.id = postInfo.service_request_id;
                post.date = postInfo.requested_datetime;
                post.date_extracted = new Date();
                post.service = 'seeclickfix';
                post.account = "";
                post.match = match;
                post.image = postInfo.media_url;
                post.text = postInfo.description;
                post.likes = 0;
                post.loc = {
                    type : "Point",
                    coordinates : [parseFloat(postInfo.long), parseFloat(postInfo.lat)],
                    address: postInfo.address
                }

                post.url = postInfo.media_url;
                post.icon = "";
                post.save();

                callback();
            });
        });

        async.parallel(postsTasks, function(){
            callback();
        });

    } else {

        callback();

    }

}

exports.proceedIfParamsAreValid = function(user, callback){
    if(user.lat!=undefined && user.lng!=undefined){
        callback();
    }
}