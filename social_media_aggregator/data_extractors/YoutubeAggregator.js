var express = require('express'),
    request = require('request'),
    async = require('async'),
    AggregatorController = require('../AggregatorController'),
    _ = require('lodash'),
    Post = require('../../model/Post');

var session = {};
var searchCriteria = {};

exports.aggregateData = function(userName, agency) {
    var $that = this;

    AggregatorController.gatherSearchCriteria(userName, agency.name, agency.youtube, 'youtube', function(criteria){
        searchCriteria = criteria;

        $that.extractData(userName, agency.name, criteria);
    });
}

exports.extractData = function(userName, agencyName, criteria){
    this.extractChannelsData(userName, agencyName, criteria);
    this.extractSearchData(userName, agencyName, criteria);
}

exports.extractSearchData = function(userName, agencyName, criteria){
    var $that = this;

    criteria.tags.forEach(function(search){
        AggregatorController.runWithTimeout(search.frequency, null, function(){
            logger.log('info', 'Extracting data from Youtube search %s', search.name);
            $that.encodeSearchCriteria(search.name, function(criteria){
                $that.getLastPostTime(criteria, function(lastPostTime){
                    $that.getSearchResults(userName, agencyName, criteria, lastPostTime, function(searchResults){
                        if(searchResults!=undefined){
                            var videosTasks = [];

                            searchResults.forEach(function(video){
                                videosTasks.push(function(callback){
                                    $that.extractVideoInfo(video.id.videoId, function(videoInfo){
                                        $that.savePost(userName, agencyName, videoInfo, function(){
                                            callback();
                                        });
                                    });
                                });
                            });

                            async.parallel(videosTasks, function(){
                            });
                        }
                    });
                });
            });
        });
    });
}

exports.extractChannelsData = function(userName, agencyName, criteria){
    var $that = this;

    criteria.accounts.forEach(function(channel){
        AggregatorController.runWithTimeout(channel.frequency, null, function(){
            logger.log('info', 'Extracting data from Youtube channel %s', channel.name);
            $that.getChannel(channel.name, function(channelsResult){
                if(channelsResult!=undefined){
                    // var playlistIds = [
                    //     channelsResult[0].contentDetails.relatedPlaylists.uploads,
                    //     channelsResult[0].contentDetails.relatedPlaylists.likes,
                    //     channelsResult[0].contentDetails.relatedPlaylists.favorites
                    // ];
                    //$that.getPlaylistItems(playlistIds, function(playlistItems){
                    $that.getActivityItems(channelsResult[0].id, function(playlistItems){
                        if(playlistItems!=undefined){
                            var videosTasks = [];

                            playlistItems.forEach(function(video){
                                // get favorite, like, or upload

                                // why??
                                var videoId =  _.get(video, 'contentDetails.upload.resourceId.videoId')
                                    || _.get(video, 'contentDetails.like.resourceId.videoId')
                                    || _.get(video, 'contentDetails.favorite.resourceId.videoId')
                                    || null;
                                if(videoId) {
                                    videosTasks.push(function(callback){
                                        $that.extractVideoInfo(videoId, function(videoInfo){
                                            if(videoInfo!=undefined){
                                                $that.savePost(userName, agencyName, videoInfo, function(){
                                                    callback();
                                                });
                                            } else {
                                                callback();
                                            }
                                        });
                                    });
                                }
                            });

                            async.parallel(videosTasks, function(){
                            });
                        }
                    });
                }
            });
        });
    });
}

exports.getChannel = function(channel, callback){
    logger.log('debug', 'Extracting data from Youtube channel %s', channel);
    request({
        url: 'https://www.googleapis.com/youtube/v3/channels?forUsername=' + channel + '&part=contentDetails&key=' + config.apps.google.key,
        method: 'GET'
    }, function(error, response, body) {
        if(error || !body || !response) {
            return callback(undefined);
        }
        else {
            body = JSON.parse(body);

            return body!=undefined && body.items!=undefined && body.items.length!=0 ? callback(body.items) : callback(undefined);
        }
    });
}

exports.getActivityItems = function(channelId, callback){
    request({
        url: 'https://www.googleapis.com/youtube/v3/activities?maxResults=' + config.app.postsLimit + '&part=contentDetails&channelId=' + channelId + '&key=' + config.apps.google.key,
        method: 'GET'
    }, function(error, response, body) {
        if(error || !body || !response) {
            return callback(undefined);
        }
        else {
            body = JSON.parse(body);

            return body!=undefined && body.items!=undefined && body.items.length!=0 ? callback(body.items) : callback(undefined);
        }
    });
}

exports.getPlaylistItems = function(playlistIds, callback){
    request({
        url: 'https://www.googleapis.com/youtube/v3/playlistItems?maxResults=' + config.app.postsLimit + '&part=contentDetails&id=' + playlistIds.join(',') + '&key=' + config.apps.google.key,
        method: 'GET'
    }, function(error, response, body) {
        if(error || !body || !response) {
            return callback(undefined);
        }
        else {
            body = JSON.parse(body);

            return body!=undefined && body.items!=undefined && body.items.length!=0 ? callback(body.items) : callback(undefined);
        }
    });
}

exports.extractVideoInfo = function(videoId, callback){
    request({
        url: 'https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet,status,statistics&id=' + videoId + '&key=' + config.apps.google.key,
        method: 'GET'
    }, function(error, response, body) {
        if(error || !body || !response) {
            return callback(undefined);
        }
        else {
            body = JSON.parse(body);

            return body!=undefined && body.items!=undefined && body.items.length!=0 ? callback(body.items) : callback(undefined);
        }
    });
}

exports.encodeSearchCriteria = function(criteria, callback){
    return callback(criteria.replace(" ", "+"));
}

exports.getLastPostTime = function(match, callback){
    Post.getLastPostTime('youtube', match, function(lastPostTime){
        return callback(lastPostTime);
    });
}

exports.getSearchResults = function(userName, agencyName, searchCriteria, lastPostTime, callback){
    logger.log('debug', 'Extracting data from Youtube search %s', searchCriteria);
    var url = 'https://www.googleapis.com/youtube/v3/search?part=id,snippet&q=' + searchCriteria + '&type=video&key=' + config.apps.google.key;
    url += lastPostTime!=undefined ? "&publishedAfter=" + lastPostTime : "";
    url += "&maxResults=" + config.app.postsLimit;

    request({
        url: url,
        method: 'GET'
    }, function(error, response, body) {
        if(error || !body || !response) {
            return callback(undefined);
        } else {
            body = JSON.parse(body);

            return body!=undefined && body.items!=undefined && body.items.length!=0 ? callback(body.items) : callback(undefined);
        }
    });
}

exports.savePost = function(userName, agencyName, videoInfo, callback){
    var post = new Post();
    videoInfo = videoInfo[0];

    post.userName = userName;
    post.agencyName = agencyName;
    post.id = videoInfo.id;
    post.date = new Date(videoInfo.snippet.publishedAt);
    post.date_extracted = new Date();
    post.service = 'youtube';
    post.match = '@' + videoInfo.snippet.channelTitle;
    post.text = videoInfo.snippet.title;
    post.likes = videoInfo.statistics.likeCount;
    post.account = videoInfo.snippet.channelTitle;
    post.url = 'https://www.youtube.com/watch?v=' + videoInfo.id;
    post.image = _.get(videoInfo, 'snippet.thumbnails.medium.url') || _.get(videoInfo, 'snippet.thumbnails.default.url');
    post.icon = '';

    post.save();
    callback();
}

