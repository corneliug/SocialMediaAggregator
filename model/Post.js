var mongoose = require('mongoose'),
    random = require('mongoose-simple-random'),
    config = require('../config/config.js');

var ObjectId = mongoose.Schema.ObjectId;

var PostSchema = new mongoose.Schema({
    id: {type: String, unique : true, required : true, dropDups: true},
    date: Date,
    date_extracted: Date,
    service: String,
    account: String,
    match: String,
    icon: String,
    url: String,
    text: String,
    likes: Number
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
        return posts.length!=0 ? callback(posts[0].date.getTime()) : callback(undefined);
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

PostSchema.static('getRandom', function(criteria, callback){
    RandomPostsProvider.findRandom(criteria, {}, {limit: config.app.feedLimit}, function(err, results) {
        if (!err) {
            callback(results);
        }
    });
});

PostSchema.static('deleteByPlatformAndAccount', function(platform, account){
    this.find({
        service: platform,
        match: account
    }).exec(function (err, posts) {
        posts.remove();
    });
});

module.exports = mongoose.model('Post', PostSchema);