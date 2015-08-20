var ObjectId, Schema, Post, mongoose;

mongoose = require('mongoose');

Schema = mongoose.Schema;
ObjectId = Schema.ObjectId;

Post = new Schema({
    id: {type: String, unique : true, required : true, dropDups: true},
    date: Date,
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

Post.static('getLastPostTime', function(service, match, callback){
    this.find({
        service: service,
        match: match
    }).sort({
        date: -1
    }).exec(function (err, posts) {
        return posts.length!=0 ? callback(posts[0].date.getTime()) : callback(undefined);
    });
});

Post.static('getLastPostId', function(service, match, callback){
    this.find({
        service: service,
        match: match
    }).sort({
        id: -1
    }).exec(function (err, posts) {
        return posts.length!=0 ? callback(posts[0].id) : callback(undefined);
    });
});

module.exports = mongoose.model('Post', Post);