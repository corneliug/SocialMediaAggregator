var express = require('express'),
    request = require('request'),
    async = require('async'),
    AggregatorController = require('../AggregatorController'),
    Post = require('../../model/Post'),
    uuid = require('node-uuid'),
    OAuth = require('oauth').OAuth;

exports.aggregateData = function(user, agency) {
    var $that = this;

    $that.config(function(oauth){
        AggregatorController.runWithTimeout(agency.yelp.frequency, null, function(){
            $that.extractData(user, agency, oauth);
        });
    });
}

exports.config = function(callback){
    var oauth = new OAuth(
        config.apps.yelp.token,
        process.env.YELP_TOKEN_SECRET,
        config.apps.yelp.consumer_key,
        process.env.YELP_CONSUMER_SECRET,
        "1.0",
        null,
        'HMAC-SHA1'
    );

    callback(oauth);
}

exports.extractData = function(user, agency, oauth){
    var tasks = [];
    var $that = this;

    agency.yelp['feeds'].forEach(function(query){
        tasks.push(function(callback){
            $that.extractYelpPosts(agency.yelp, query.query, user, oauth, function(posts){
                $that.savePosts(user.name, agency.name, query.query, posts, callback);
            });
        });
    });

    async.parallel(tasks, function(){
    });
}

exports.extractYelpPosts = function(agency, location, user, oauth, callback){
    if(location!=null){
        var guid = uuid.v4();

        var url = "https://api.yelp.com/v2/search/?";
        url += "location=" + location;
        url += "&limit=" + config.app.postsLimit;
        url += "&radius_filter=5000";

        oauth.get(
            url,
            config.apps.yelp.token,
            process.env.YELP_TOKEN_SECRET,
            function(error, data, response) {
                if(!error){
                    data = JSON.parse(data);
                    callback(data.businesses);
                } else {
                    callback(undefined);
                }
            }
        );
    }
}

exports.savePosts = function(userName, agencyName, match, posts, callback){

    if(posts!=undefined && posts.length!=0){
        var postsTasks = [];

        posts.forEach(function(postInfo){
            postsTasks.push(function(callback){
                var post = new Post();

                post.userName = userName;
                post.agencyName = agencyName;
                post.id = postInfo.id;
                post.date = '';
                post.date_extracted = new Date();
                post.service = 'yelp';
                post.account = "";
                post.match = match;
                post.image = postInfo.image_url;
                post.text = postInfo.name;
                post.likes = 0;
                post.url = postInfo.url;
                post.icon = "";

                if(postInfo.location!=undefined && postInfo.location.coordinate!=undefined){
                    post.loc = {
                        type : "Point",
                        coordinates : [parseFloat(postInfo.location.coordinate.longitude), parseFloat(postInfo.location.coordinate.latitude)],
                        address: postInfo.location.display_address!=undefined && postInfo.location.display_address.length!=0
                            ? postInfo.location.display_address.join() : ''
                    }
                }

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