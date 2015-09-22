var express = require('express'),
    request = require('request'),
    async = require('async'),
    AggregatorController = require('../AggregatorController'),
    _ = require('lodash'),
    Post = require('../../model/Post'),
    time = require('time');

var session = {};
var searchCriteria = {};

exports.aggregateData = function(userName, agency) {
    var $that = this;

    AggregatorController.gatherSearchCriteria(userName, agency, 'youtube', function(criteria){
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
    var searchTasks = [];

    criteria.tags.forEach(function(search){
        searchTasks.push(function(callback){
            $that.encodeSearchCriteria(search, function(criteria){
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

exports.extractChannelsData = function(userName, agencyName, criteria){
    var $that = this;
    var channelTasks = [];

    criteria.profiles.forEach(function(channel){
        channelTasks.push(function(callback){
            $that.getChannel(channel, function(channelsResult){
                if(channelsResult!=undefined){
                    $that.getPlaylistItems(channelsResult[0].contentDetails.relatedPlaylists.uploads, function(playlistItems){
                        if(playlistItems!=undefined){
                            var videosTasks = [];

                            playlistItems.forEach(function(video){
                                videosTasks.push(function(callback){
                                    $that.extractVideoInfo(video.contentDetails.videoId, function(videoInfo){
                                        if(videoInfo!=undefined){
                                            $that.savePost(userName, agencyName, videoInfo, function(){
                                                callback();
                                            });
                                        } else {
                                            callback();
                                        }
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
    Post.getLastPostTime('youtube', match, function(lastPostTime){
        return callback(lastPostTime);
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

exports.savePost = function(userName, agencyName, videoInfo, callback){
    var post = new Post();
    videoInfo = videoInfo[0];

    post.userName = userName;
    post.agencyName = agencyName;
    post.id = videoInfo.id;
    post.date = new time.Date(videoInfo.snippet.publishedAt, 'UTC');
    now = new time.Date();
    now.setTimezone("UTC");
    post.date_extracted = now;
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

