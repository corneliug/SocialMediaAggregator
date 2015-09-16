var express = require('express'),
    request = require('request'),
    User    = require('../../model/User'),
    Post    = require('../../model/Post'),
    config  = require('../../config/config.js'),
    async   = require('async'),
    fs      = require('fs'),
    _       = require('lodash'), 
    router = express.Router();

// Returns array
var getPostsFromUserAsync = function(userName, agencyName, limit, services, postsList) {
    services = services || ['facebook', 'twitter', 'instagram', 'youtube'];
    var asyncTasks = [];
    _.forEach(services, function(service) {
        var criteria = {
            service: service,
            userName: userName
        }
        if(agencyName) {
            criteria['agencyName'] = agencyName;
        }
        asyncTasks.push(function(callback){ 
            Post.getLatest(criteria, Math.ceil(limit/services.length), function(posts){
                postsList.push.apply(postsList, posts);
                callback();
            })
        });
    });
    return asyncTasks;
};

router.route('/:user/feed/:agency?')
    .get(function(req, res) {
        var limit       = req.query.limit!=undefined ? req.query.limit : 10,
            userName    = _.get(req, 'params.user'),
            agencyName  = _.get(req, 'params.agency') || 'default',
            services    = _.get(req, 'query.services');

        if(userName) {
            var postsList  = [],
                asyncTasks = getPostsFromUserAsync(
                                userName, agencyName, limit, services, postsList
                             );
            async.parallel(asyncTasks, function(){
                res.json(postsList);
            });
        }
        else {
            res.status(500).json({ error: 'message' });
        }
    });
    
// router.route('/:user/accounts/delete')
//     .post(function(req, res) {
//         var payload = req.body;

//         config.accounts.twitter = removeCriteria(config.accounts.twitter, payload.accounts.twitter, 'twitter');
//         config.accounts.facebook = removeCriteria(config.accounts.facebook, payload.accounts.facebook, 'facebook');
//         config.accounts.youtube = removeCriteria(config.accounts.youtube, payload.accounts.youtube, 'youtube');
//         config.accounts.instagram = removeCriteria(config.accounts.instagram, payload.accounts.instagram, 'instagram');

//         fs.writeFile(__dirname + "/../../config/config.js", "module.exports = " + JSON.stringify(config, null, 4), function(err) {
//             if(err) {
//                 return console.log(err);
//             }

//             logger.log("debug", "Config file updated!");
//         });

//         res.json({response: 'success'});
//     });

// var addCriteria = function(destination, newCriteria){
//     if(newCriteria!=undefined && newCriteria.length!=0){
//         for(var i in newCriteria){
//             var criteria = newCriteria[i];

//             if(destination.indexOf(criteria)==-1){
//                 destination.push(criteria);
//             }
//         }
//     }

//     return destination;
// }

// exports.removeCriteria = function(destination, criteria, platform){
//     if(criteria!=undefined && criteria.length!=0){
//         for(var i in criteria){
//             var toDelete = criteria[i];

//             var indexToDel = destination.indexOf(toDelete);
//             if(indexToDel!=-1){
//                 Post.deleteByPlatformAndAccount(platform, toDelete);
//                 destination.splice(indexToDel, 1);
//             }
//         }
//     }

//     return destination;
// }

module.exports = router;