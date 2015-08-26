var express = require('express'),
    request = require('request'),
    Post = require('../../model/Post'),
    config = require('../../config/config.js'),
    async = require('async'),
    fs = require('fs'),
    router = express.Router();

router.route('/feed')
    .get(function(req, res) {
        var limit = req.query.limit!=undefined ? req.query.limit : undefined;

        var filterOpts = [
                {service: 'twitter'},
                {service: 'facebook'},
                {service: 'instagram'},
                {service: 'youtube'}
            ];

        var asyncTasks = [];
        var postsList = [];

        filterOpts.forEach(function(criteria){
            asyncTasks.push(function(callback){
                Post.getRandom(criteria, limit/4, function(posts){
                    postsList.push.apply(postsList, posts);
                    callback();
                });
            });
        });

        async.parallel(asyncTasks, function(){
            res.json(postsList);
        });
    })
    .post(function(req, res) {
        var payload = req.body;
        var filterOpts = [
                {service: 'twitter', match: { $in: []}},
                {service: 'facebook', match: { $in: []}},
                {service: 'instagram', match: { $in: []}},
                {service: 'youtube', match: { $in: []}}
            ];

        var criteriaCount = 0;

        if(payload.accounts!=undefined && payload.accounts.twitter!=undefined && payload.accounts.twitter.length!=0){
            filterOpts[0].match.$in = payload.accounts.twitter;
            ++criteriaCount;
        }

        if(payload.accounts!=undefined && payload.accounts.facebook!=undefined && payload.accounts.facebook.length!=0){
            filterOpts[1].match.$in = payload.accounts.facebook;
            ++criteriaCount;
        }

        if(payload.accounts!=undefined && payload.accounts.instagram!=undefined && payload.accounts.instagram.length!=0){
            filterOpts[2].match.$in = payload.accounts.instagram;
            ++criteriaCount;
        }

        if(payload.accounts!=undefined && payload.accounts.youtube!=undefined && payload.accounts.youtube.length!=0){
            filterOpts[3].match.$in = payload.accounts.youtube;
            ++criteriaCount;
        }

        var limit = req.query.limit!=undefined ? req.query.limit : undefined;

        var asyncTasks = [];
        var postsList = [];

        filterOpts.forEach(function(criteria){
            asyncTasks.push(function(callback){
                Post.getRandom(criteria, limit/criteriaCount, function(posts){
                    postsList.push.apply(postsList, posts);
                    callback();
                });
            });
        });

        async.parallel(asyncTasks, function(){
            res.json(postsList);
        });
    });

router.route('/accounts/add')
    .post(function(req, res) {
        var payload = req.body;

        config.accounts.twitter = addCriteria(config.accounts.twitter, payload.accounts.twitter);
        config.accounts.facebook = addCriteria(config.accounts.facebook, payload.accounts.facebook);
        config.accounts.youtube = addCriteria(config.accounts.youtube, payload.accounts.youtube);
        config.accounts.instagram = addCriteria(config.accounts.instagram, payload.accounts.instagram);

        fs.writeFile(__dirname + "/../../config/config.js", "module.exports = " + JSON.stringify(config, null, 4), function(err) {
            if(err) {
                return console.log(err);
            }

            logger.log("debug", "Config file updated!");
        });

        res.json({response: 'success'});
    });

router.route('/accounts/delete')
    .post(function(req, res) {
        var payload = req.body;

        config.accounts.twitter = removeCriteria(config.accounts.twitter, payload.accounts.twitter, 'twitter');
        config.accounts.facebook = removeCriteria(config.accounts.facebook, payload.accounts.facebook, 'facebook');
        config.accounts.youtube = removeCriteria(config.accounts.youtube, payload.accounts.youtube, 'youtube');
        config.accounts.instagram = removeCriteria(config.accounts.instagram, payload.accounts.instagram, 'instagram');

        fs.writeFile(__dirname + "/../../config/config.js", "module.exports = " + JSON.stringify(config, null, 4), function(err) {
            if(err) {
                return console.log(err);
            }

            logger.log("debug", "Config file updated!");
        });

        res.json({response: 'success'});
    });

var addCriteria = function(destination, newCriteria){
    if(newCriteria!=undefined && newCriteria.length!=0){
        for(var i in newCriteria){
            var criteria = newCriteria[i];

            if(destination.indexOf(criteria)==-1){
                destination.push(criteria);
            }
        }
    }

    return destination;
}

exports.removeCriteria = function(destination, criteria, platform){
    if(criteria!=undefined && criteria.length!=0){
        for(var i in criteria){
            var toDelete = criteria[i];

            var indexToDel = destination.indexOf(toDelete);
            if(indexToDel!=-1){
                Post.deleteByPlatformAndAccount(platform, toDelete);
                destination.splice(indexToDel, 1);
            }
        }
    }

    return destination;
}

module.exports = router;