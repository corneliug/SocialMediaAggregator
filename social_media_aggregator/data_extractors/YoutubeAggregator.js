var express = require('express'),
    request = require('request'),
    async = require('async'),
    AggregatorController = require('../AggregatorController'),
    Post = require('../../model/Post');

var session = {};
var searchCriteria = {};

exports.aggregateData = function() {
    var $that = this;

    AggregatorController.gatherSearchCriteria(AggregatorController.PLATFORMS.YOUTUBE, function(criteria){
        searchCriteria = criteria;

        $that.extractData();
    });
}

exports.extractData = function(){
    this.extractChannelsData();
    this.extractSearchData();
}

exports.extractSearchData = function(){
    var $that = this;
    var searchTasks = [];

    searchCriteria.tags.forEach(function(search){
        searchTasks.push(function(callback){
            $that.encodeSearchCriteria(search, function(criteria){
                $that.getLastPostTime(criteria, function(lastPostTime){
                    $that.getSearchResults(criteria, lastPostTime, function(searchResults){
                        if(searchResults!=undefined){
                            var videosTasks = [];

                            logger.log('info', 'Extracted %s new posts from Youtube search %s', searchResults.length, criteria);
                            searchResults.forEach(function(video){
                                videosTasks.push(function(callback){
                                    $that.extractVideoInfo(video.id.videoId, function(videoInfo){
                                        $that.savePost(videoInfo, function(){
                                            callback();
                                        });
                                    });
                                });
                            });

                            async.parallel(videosTasks, function(){
                                callback()
                            });
                        } else {
                            callback();
                        }
                    });
                });
            });
        });
    });

    async.parallel(searchTasks, function(){
    });
}

exports.extractChannelsData = function(){
    var $that = this;
    var channelTasks = [];

    searchCriteria.profiles.forEach(function(channel){
        channelTasks.push(function(callback){
            $that.getChannel(channel, function(channelsResult){
                if(channelsResult!=undefined){
                    $that.getPlaylistItems(channelsResult[0].contentDetails.relatedPlaylists.uploads, function(playlistItems){
                        if(playlistItems!=undefined){
                            var videosTasks = [];

                            logger.log('info', 'Extracted %s new posts from Youtube channel %s', playlistItems.length, channel);
                            playlistItems.forEach(function(video){
                                videosTasks.push(function(callback){
                                    $that.extractVideoInfo(video.contentDetails.videoId, function(videoInfo){
                                        $that.savePost(videoInfo, function(){
                                            callback();
                                        });
                                    });
                                });
                            });

                            async.parallel(videosTasks, function(){
                                callback()
                            });
                        } else {
                            callback();
                        }
                    });
                } else {
                    callback();
                }
            });
        });
    });

    async.parallel(channelTasks, function(){
    });
}

exports.getChannel = function(channel, callback){
    logger.log('debug', 'Extracting data from Youtube channel %s', channel);
    request({
        url: 'https://www.googleapis.com/youtube/v3/channels?forUsername=' + channel + '&part=contentDetails&key=' + config.apps.google.key,
        method: 'GET'
    }, function(error, response, body) {
        body = JSON.parse(body);

        return body!=undefined && body.items!=undefined && body.items.length!=0 ? callback(body.items) : callback(undefined);
    });
}

exports.getPlaylistItems = function(playlistId, callback){
    request({
        url: 'https://www.googleapis.com/youtube/v3/playlistItems?maxResults=' + config.app.postsLimit + '&part=contentDetails&playlistId=' + playlistId + '&key=' + config.apps.google.key,
        method: 'GET'
    }, function(error, response, body) {
        body = JSON.parse(body);

        return body!=undefined && body.items!=undefined && body.items.length!=0 ? callback(body.items) : callback(undefined);
    });
}

exports.extractVideoInfo = function(videoId, callback){
    request({
        url: 'https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet,status,statistics&id=' + videoId + '&key=' + config.apps.google.key,
        method: 'GET'
    }, function(error, response, body) {
        body = JSON.parse(body);

        return body!=undefined && body.items!=undefined && body.items.length!=0 ? callback(body.items) : callback(undefined);
    });
}

exports.encodeSearchCriteria = function(criteria, callback){
    return callback(criteria.replace(" ", "+"));
}

exports.getLastPostTime = function(match, callback){
    Post.getLastPostTime('youtube', match, function(lastPostId){
        return callback(lastPostId);
    });
}

exports.getSearchResults = function(searchCriteria, lastPostTime, callback){
    logger.log('debug', 'Extracting data from Youtube search %s', searchCriteria);
    var url = 'https://www.googleapis.com/youtube/v3/search?part=id,snippet&q=' + searchCriteria + '&type=video&key=' + config.apps.google.key;
    url += lastPostTime!=undefined ? "&publishedAfter=" + lastPostTime : "";
    url += "&maxResults=" + config.app.postsLimit;

    request({
        url: url,
        method: 'GET'
    }, function(error, response, body) {
        body = JSON.parse(body);

        return body!=undefined && body.items!=undefined && body.items.length!=0 ? callback(body.items) : callback(undefined);
    });
}

exports.savePost = function(videoInfo, callback){
    var post = new Post();

    videoInfo = videoInfo[0];

    post.id = videoInfo.id;
    post.date = new Date(videoInfo.snippet.publishedAt);
    post.date_extracted = new Date();
    post.service = 'youtube';
    post.match = '@' + videoInfo.snippet.channelTitle;
    post.text = videoInfo.snippet.title;
    post.likes = videoInfo.statistics.likeCount;
    post.account = videoInfo.snippet.channelTitle;
    post.url = 'https://www.youtube.com/watch?v=' + videoInfo.id;
    post.icon = videoInfo.snippet.thumbnails.default.url;

    post.save();
    callback();
}

