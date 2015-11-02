var express = require('express'),
    request = require('request'),
    async = require('async'),
    AggregatorController = require('../AggregatorController'),
    Post = require('../../model/Post'),
    AdmZip = require('adm-zip'),
    http = require('http'),
    url = require('url');

exports.aggregateData = function(user, agency) {
    var $that = this;

    AggregatorController.runWithTimeout(agency.gtfs.frequency, null, function(){
        $that.cleanData(user.name, 'gtfs',  agency.name, function(){
            $that.extractData(user, agency);
        });
    });
}

exports.cleanData = function(userName, platform, agencyName, callback){
    Post.deleteByUserAgencyAndService(userName, agencyName, platform);

    callback();
}

exports.extractData = function(user, agency){
    var tasks = [];
    var $that = this;

    agency.gtfs['feeds'].forEach(function(query){
        tasks.push(function(callback){
            $that.extractGtfsPosts(query.url, function(posts){
                $that.savePosts(user.name, agency.name, query.type, posts, callback);
            });

        });
    });

    async.parallel(tasks, function(){
    });
}

exports.extractGtfsPosts = function(file_url, callback){
    var options = {
        host: url.parse(file_url).host,
        port: 80,
        path: url.parse(file_url).pathname
    };

    return http.get(options, function(res) {
        var data = [], dataLen = 0;

        res.on('data', function(chunk) {

            data.push(chunk);
            dataLen += chunk.length;

        }).on('end', function() {
            var buf = new Buffer(dataLen);

            for (var i=0, len = data.length, pos = 0; i < len; i++) {
                data[i].copy(buf, pos);
                pos += data[i].length;
            }

            var zip = new AdmZip(buf);
            var zipEntries = zip.getEntries(); // an array of ZipEntry records

            var dataFile = undefined;

            zipEntries.forEach(function(zipEntry) {
                if (zipEntry.entryName == "stops.txt") {
                    dataFile = zip.readAsText(zipEntry);
                    dataFile = dataFile.split('\n');
                }
            });

            callback(dataFile);
        });
    });
}


exports.savePosts = function(userName, agencyName, match, posts, callback){

    if(posts!=undefined && posts.length!=0){
        var postsTasks = [];

        posts.shift();
        posts.forEach(function(postInfo){
            postsTasks.push(function(callback){
                postInfo = postInfo.split(",");
                var post = new Post();

                post.userName = userName;
                post.agencyName = agencyName;
                post.id = postInfo[0];
                post.date = '';
                post.date_extracted = new Date();
                post.service = 'gtfs';
                post.account = '';
                post.match = match;
                post.image = '';
                post.text = postInfo[1];
                post.likes = 0;
                post.url = '';
                post.icon = '';

                post.loc = {
                    type : "Point",
                    coordinates : [parseFloat(postInfo[3]), parseFloat(postInfo[2])],
                    address: ''
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