var mongoose = require('mongoose'),
    random = require('mongoose-simple-random'),
    config = require('../config/config.js'),
    moment = require('moment-timezone');

var ObjectId = mongoose.Schema.ObjectId;

var PostSchema = new mongoose.Schema({
    id: {type: String, unique : true, required : true, dropDups: true},
    date: Date,
    date_extracted: Date,
    service: String,
    account: String,
    userName: String,
    agencyName: String,
    match: String,
    icon: String,
    image: String,
    url: String,
    website: String,
    googleLocalHours: String,
    text: String,
    likes: Number,
    agg_user: String,
    loc : Object,
    address: String
}, {
    collection: 'sma_posts'
});

PostSchema.plugin(random);
var RandomPostsProvider = mongoose.model('RandomPostsProvider', PostSchema);


PostSchema.static('getLastPostTime', function(service, match, callback){
    this.find({
        service: service,
        match: match
    }).sort({
        date: -1
    }).exec(function (err, posts) {
        if(posts.length!=0 ) {
            var time = moment.tz(posts[0].date, 'America/Los_Angeles').valueOf();
            return callback(Math.floor(time/1000));
        }
        else {
            return callback(undefined)
        }
    });
});

PostSchema.static('getLastPostId', function(service, match, callback){
    this.find({
        service: service,
        match: match
    }).sort({
        id: -1
    }).exec(function (err, posts) {
        return posts.length!=0 ? callback(posts[0].id) : callback(undefined);
    });
});

PostSchema.static('getByUser', function(userName, callback){
    this.find({
        userName: userName
    }).exec(function (err, posts) {
        return callback(posts);
    });
});

PostSchema.static('getByUserAndServices', function(userName, services, callback){
    this.find({
        userName: userName,
        service: { $in : services}
    }).exec(function (err, posts) {
        return callback(posts);
    });
});

PostSchema.static('getByUserServiceTypeAndQuery', function(userName, service, type, query, callback){
    var match = '';

    if(type == 'account') {
        match = '@';
    } else if(type == 'hashtag') {
        match = '#';
    }

    match+= query;

    this.find({
        userName: userName,
        match: match,
        service: service
    }).exec(function (err, posts) {
        return callback(posts);
    });
});

PostSchema.static('getLatest', function(criteria, limit, callback){
    limit =  limit!=undefined ? limit : config.app.feedLimit;
    this.find(criteria).sort({
        date: -1
    }).limit(limit).exec(function (err, posts) {
        return posts.length!=0 ? callback(posts) : callback(undefined);
    });
});

PostSchema.static('getRandom', function(criteria, limit, callback){
    RandomPostsProvider.findRandom(criteria, {}, {limit: limit!=undefined ? limit : config.app.feedLimit}, function(err, results) {
        if (!err) {
            callback(results);
        }
    });
});

PostSchema.static('deleteByUser', function(userName){
    this.find({
        userName: userName
    }).remove().exec();
});

PostSchema.static('deleteByUserAndAgency', function(userName, agencyName){
    this.find({
        userName: userName,
        agencyName: agencyName
    }).remove().exec();
});

PostSchema.static('deleteByUserAgencyAndService', function(userName, agencyName, platform){
    this.find({
        userName: userName,
        agencyName: agencyName,
        service: platform
    }).remove().exec();
});

module.exports = mongoose.model('Post', PostSchema);