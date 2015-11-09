var express = require('express'),
    request = require('request'),
    async = require('async'),
    AggregatorController = require('../AggregatorController'),
    Post = require('../../model/Post'),
    _ = require('lodash'),
    fs = require('fs');

exports.aggregateData = function(user, agency) {
    var $that = this;

    AggregatorController.runWithTimeout(agency.socrata.frequency, null, function(){
        $that.extractData(user, agency.name, agency.foursquare['feeds']);
    });
}

exports.extractData = function(user, agencyName, criteria){
    var urlTasks = [];
    var $that = this;

    criteria.forEach(function(query){
        urlTasks.push(function(callback){

            $that.extractFsquarePosts(user.lat, user.lng, query.query, function(posts){
                $that.savePosts(user.name, agencyName, query.query, posts, callback);
            });

        });
    });

    async.parallel(urlTasks, function(){
    });
}

exports.deletePreviousResults = function(username, match){
    Post.deleteByUserAndPlatformAndAccount(username, 'foursquare', match);
}

exports.extractFsquarePosts = function(lat, lng, query, callback){
    var url = "https://api.foursquare.com/v2/venues/explore?ll=" + lat + "," + lng + "&query=" + query;
    url += "&limit=" + config.app.postsLimit;
    url += "&radius=5000";
    url += "&venuePhotos=1";
    url += "&client_id=" + config.apps.foursquare.key + "&client_secret=" + process.env.FOURSQUARE_SECRET;
    url += "&v=20141020";

    request({
        url: url,
        method: 'GET'
    }, function(error, response, body) {
        if(error || !body || !response) {
            return callback(undefined);
        }
        else {
            body = JSON.parse(body);
            var posts = undefined;

            if(body!=null && body.response!=null && body.response.groups!=null){
                _.forEach(body.response.groups, function(group){
                    if(group.type == 'Recommended Places'){
                        posts = group.items;
                    }
                });
            }

            return callback(posts);
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
                post.id = postInfo.venue!=undefined ? postInfo.venue.id : "";
                post.date = "";
                post.date_extracted = new Date();
                post.service = 'foursquare';
                post.account = '';
                post.match = '#' + match;

                if(postInfo.venue!=undefined && postInfo.venue.photos!=undefined && postInfo.venue.photos.groups!=undefined){
                    var photoGroup = postInfo.venue.photos.groups[0];
                    photoGroup = photoGroup!=undefined && photoGroup.items!=undefined && photoGroup.items.length!=0
                        ? photoGroup.items[0]
                        : undefined;

                    post.image = photoGroup!=undefined && photoGroup.suffix!=undefined && photoGroup.prefix!=0
                        ? photoGroup.prefix + '300x300' + photoGroup.suffix
                        : '';
                } else {
                    post.image = '';
                }


                post.text = postInfo.venue!=undefined & postInfo.venue.name!=undefined ? postInfo.venue.name : '';
                post.likes = postInfo.venue!=undefined && postInfo.venue.rating!=undefined ? postInfo.venue.rating : 0;

                if(postInfo.venue!=undefined && postInfo.venue.location!=undefined){
                    post.loc = {
                        type : "Point",
                        coordinates : [parseFloat(postInfo.venue.location.lng), parseFloat(postInfo.venue.location.lat)],
                        address: postInfo.venue.location.formattedAddress!=null && postInfo.venue.location.formattedAddress.length!=0
                            ? postInfo.venue.location.formattedAddress[0]
                            : ''
                    }
                } else {
                    post.loc = {};
                }


                post.url = 'https://foursquare.com/v/' + post.id;
                post.icon = '';

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