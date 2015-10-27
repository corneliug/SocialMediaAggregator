var express = require('express'),
    request = require('request'),
    AggregatorController = require('../AggregatorController'),
    Post = require('../../model/Post'),
    _ = require('lodash'),
    fs = require('fs');

var FeedParser = require('feedparser')
    , request = require('request');

exports.aggregateData = function(user, agency) {
    var $that = this;

    AggregatorController.runWithTimeout(agency.rss.frequency, null, function(){
        $that.extractData(user, agency);
    });

}

exports.extractData = function(user, agency){
    var $that = this;

    agency.rss['feeds'].forEach(function(criteria){
        $that.extractRSSPosts(criteria.query, agency.name, user.name, criteria.type);
    });

}

exports.extractRSSPosts = function(url, agencyName, userName, match){
    var $that = this;

    var req = request(url)
        , feedparser = new FeedParser([]);

    req.on('error', function (error) {
        // handle any request errors
    });
    req.on('response', function (res) {
        var stream = this;

        if (res.statusCode != 200) return this.emit('error', new Error('Bad status code'));

        stream.pipe(feedparser);
    });


    feedparser.on('error', function(error) {
        // always handle errors
    });

    feedparser.on('readable', function() {
        // This is where the action is!
        var stream = this
            , meta = this.meta // **NOTE** the "meta" is always available in the context of the feedparser instance
            , item;

        while (item = stream.read()) {
            $that.savePost(item, userName, agencyName , match);
        }
    });

}

exports.savePost = function(postInfo, userName, agencyName, match){

    if(postInfo!=undefined){
        var post = new Post();

        post.userName = userName;
        post.agencyName = agencyName;
        post.id = postInfo.guid;
        post.date = postInfo.date;
        post.date_extracted = new Date();
        post.service = 'rss';
        post.account = '';
        post.match = match;
        post.image = postInfo.image!=undefined  && postInfo.image.url!=undefined ? postInfo.image.url : '';
        post.text = postInfo.title;
        post.likes = 0;
        post.loc = {}

        post.url = postInfo.link;
        post.icon = '';
        post.save();
    }
}
