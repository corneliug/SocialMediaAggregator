var ObjectId, Schema, Post, mongoose;

mongoose = require('mongoose');

Schema = mongoose.Schema;
ObjectId = Schema.ObjectId;

Post = new Schema({
    id: String,
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
        var dt = new Date();
        dt = parseInt(dt.getTime()/1000)-5*24*60*60;

        //return posts.length!=0 ? callback(posts[0].date.getTime()) : callback(dt);
        return callback('1437394546');
    });
});

module.exports = mongoose.model('Post', Post);