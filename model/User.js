var mongoose = require('mongoose'),
    random = require('mongoose-simple-random'),
    config = require('../config/config.js'),
    Post = require('./Post'),
    UserDetailsProvider = require('./UserDetailsProvider'),
    _ = require("lodash");

var ObjectId = mongoose.Schema.ObjectId;

var FeedSchema = new mongoose.Schema({
    type: {type: String, required: true},
    frequency: {type: String, required: false},
    query: {type: String, required: true}
});

var SeeClickFixFeedSchema = new mongoose.Schema({
    status: {type: String, required: true}
});

var GtfsFeedSchema = new mongoose.Schema({
    type: {type: String, required: true},
    url: {type: String, required: true}
});

var ElectionFeedSchema = new mongoose.Schema({
    electionId: {type: String, required: true},
    address: {type: String, required: true}
});

// Holds an "agency's" accounts
var AgencySchema = new mongoose.Schema({
    name: {type: String, required : true},
    facebook: {
        frequency: {type: String, required: false},
        feeds: [FeedSchema]
    },
    instagram: {
        frequency: {type: String, required: false},
        feeds: [FeedSchema]
    },
    twitter: {
        frequency: {type: String, required: false},
        feeds: [FeedSchema]
    },
    youtube: {
        frequency: {type: String, required: false},
        feeds: [FeedSchema]
    },
    seeclickfix: {
        frequency: {type: String, required: false},
        zoom: {type: String, required: false},
        per_page: {type: String, required: false},
        feeds: [SeeClickFixFeedSchema]
    },
    rss: {
        frequency: {type: String, required: false},
        feeds: [FeedSchema]
    },
    ical: {
        frequency: {type: String, required: false},
        feeds: [FeedSchema]
    },
    yelp: {
        frequency: {type: String, required: false},
        feeds: [FeedSchema]
    },
    gtfs: {
        frequency: {type: String, required: false},
        feeds: [GtfsFeedSchema]
    },
    election: {
        frequency: {type: String, required: false},
        feeds: [ElectionFeedSchema]
    },
    socrata: {
        frequency: {type: String, required: false},
        feeds: [FeedSchema]
    },
    foursquare: {
        frequency: {type: String, required: false},
        feeds: [FeedSchema]
    }
});

var RepresentativeAddressSchema = new mongoose.Schema({
    line1: {type: String, required : false},
    city: {type: String, required : false},
    state: {type: String, required : false},
    zip: {type: String, required : false}
});

var RepresentativeChannelSchema = new mongoose.Schema({
    id: {type: String, required : false},
    type: {type: String, required : false}
});

var RepresentativeSchema = new mongoose.Schema({
    name: {type: String, required : false},
    officeName: {type: String, required : false},
    divisionId: {type: String, required : false},
    address: [RepresentativeAddressSchema],
    party: {type: String, required : false},
    phones:[{type: String, required : false}],
    urls: [{type: String, required : false}],
    channels: [RepresentativeChannelSchema]
});

var UserSchema = new mongoose.Schema({
    id: {type: String, unique : true, required : true, dropDups: true},
    parent: {type: String, unique : false},
    type: {type: String, required : false},
    name: {type: String, unique : true, required : true, dropDups: true},
    label: {type: String, required : false},
    teaser: {type: String, required : false},
    description: {type: String, required : false},
    image: {type: String, required : false},
    wikipediaUrl: {type: String, required : false},
    geojsonUrl: {type: String, required : false},
    lat: {type: Number, required : false},
    lng: {type: Number, required : false},
    date: Date,
    representatives: [RepresentativeSchema],
    geometry: {
        type: {type: String, required: false},
        coordinates: []
    },
    agencies: [AgencySchema]
}, {
    collection: 'sma_users'
});

UserSchema.index({ geometry: 'Polygon' });

UserSchema.static('allUsers', function(callback) {
    this.find().exec(function (err, users) {
        if(err) {
            return callback(err);
        }
        return users ? callback(undefined, users) : callback(undefined, undefined);
    });
});

UserSchema.static('findUser', function(name, callback){
    this.findOne({
        name: name
    }).exec(function (err, user) {
        if(err) {
            return callback(err);
        }
        return user ? callback(undefined, user) : callback(undefined, undefined);
    });
});


UserSchema.static('findUserById', function(id, callback){
    this.findOne({
        _id: id
    }).exec(function (err, user) {
        if(err) {
            return callback(err);
        }
        return user ? callback(undefined, user) : callback(undefined, undefined);
    });
});

// Helper populates agency data
UserSchema.static('agencyPopulate', function(agencyData) {
    var agency = new AgencySchema();
    agency.name = agencyData.name ? agencyData.name : 'default';
    agency.facebook = agencyData.facebook;
    agency.instagram = agencyData.facebook;
    agency.twitter = agencyData.facebook;
    agency.youtube = agencyData.facebook;
    agency.seeclickfix = agencyData.seeclickfix;
    agency.socrata = agencyData.socrata;
    agency.foursquare = agencyData.foursquare;
    return agency;
});

// Updates user agencies
// adds new if present
// updates otherwise
// deleteMode = true deletes mode
UserSchema.static('updateAgencies', function(userName, agencies, callback, deleteMode) {
    var $that = this;
    // Check if user already exists
    this.findUser(userName, function(findErr, user) {
        // Mongo error
        if(findErr) {
            callback('Connect error')
        }
        // User exists
        else if(!user) {
            callback('User doesn\'t exist');
        }
        else {
            _.forEach(agencies, function(agency){

                var existentAgency = false;

                _.forEach(user.agencies, function(userAgency, agencyKey) {
                    if(agency.name == userAgency.name) {

                        _.forEach(agency, function(service, serviceName){

                            if(deleteMode) {
                                var toDelete = [];

                                // Grab items to delete
                                _.forEach(service.feeds, function(entry){

                                    _.forEach(userAgency[serviceName].feeds, function(existEntry){
                                        if(existEntry.type == entry.type && existEntry.query == entry.query){
                                            toDelete.push(entry);
                                        }
                                    })

                                });

                                _.forEach(toDelete, function(entry){
                                    logger.log('info',"deleting posts for agency: %s, service: %s, type: %s, query: %s", agency.name, serviceName, entry.type, entry.query);
                                    //Post.deleteByUserAgencyServiceAndQuery(userName, serviceName, entry.query);
                                });

                                _.forEach(service.feeds, function(entry){
                                    var toAdd = true;

                                    _.forEach(toDelete, function(entryToDelete){
                                        if(entryToDelete.type == entry.type && entryToDelete.query == entry.query){
                                            toAdd = false;
                                        }
                                    })

                                    if(toAdd){
                                        user.agencies[agencyKey][serviceName].feeds.push(entry);
                                    }
                                });
                            } else {
                                _.forEach(service.feeds, function(entry){
                                    var toAdd = true;

                                    _.forEach(userAgency[serviceName].feeds, function(existentEntry){
                                        if(existentEntry.type == entry.type && existentEntry.query == entry.query){
                                            toAdd = false;
                                        }
                                    })

                                    if(toAdd){
                                        user.agencies[agencyKey][serviceName].feeds.push(entry);
                                    }
                                });
                            }
                        });

                        existentAgency = true;
                        return false;
                    }
                });

                // Wasn't present so add to user
                if(!existentAgency) {
                    user.agencies.push(agency);
                }

            });
            
            
            user.save(function (saveErr) {
                if(saveErr) {
                    callback('Save error');
                }
                else {
                    callback(undefined, user);
                }
            });
        }
    })
});

UserSchema.static('createUser', function(data, NewUser, callback) {
    var $that = this;
    // Check if user already exists
    this.findUser(data.name, function(findErr, user) {
        // Mongo error
        if(findErr) {
            callback('Connect error')
        }
        // User exists
        else if(user) {
            callback('User exists');
        }
        else {
            // Create new
            NewUser.name = data.name;
            NewUser.id = data.name;
            NewUser.date = new Date();

            NewUser.type = data.type;
            NewUser.label = data.label;
            NewUser.geojsonUrl = data.geojsonUrl;

            UserDetailsProvider.getUserDetails(NewUser, function(user){
                user.agencies = [];
                // Create a new agency for each entry
                if(data.agencies!=undefined){
                    _.forEach(data.agencies, function(agencyData) {
                        //var agency = $that.agencyPopulate(agencyData);
                        user.agencies.push(agencyData);
                    });
                }

                user.save(function (saveErr) {
                    if(saveErr) {
                        callback('Save error');
                    }
                    else {
                        callback(undefined, NewUser);
                    }
                });
            });
        }

    });
});

UserSchema.static('delete', function(userName, agencies, callback) {
    var $that = this;
    // Check if user already exists
    this.findUser(userName, function(findErr, user) {
        // Mongo error
        if(findErr) {
            callback('Connect error')
        }
        // User exists
        else if(!user) {
            callback('User doesn\'t exist');
        }
        else {
            // Not deleting the whole user,
            // just some agencies           
            if(agencies && agencies.length) {
                // Run through agencies
                _.forEach(user.agencies, function(agency, key) {
                    // Delete posts and agency
                    if(_.includes(agencies, agency.name)) {
                        user.agencies[key].remove();
                        Post.deleteByUserAndAgency(userName, agency.name);
                    }
                });
                user.save(function (saveErr) {
                    if(saveErr) {
                        callback('Error deleting');
                    }
                    else {
                        callback(undefined, user);
                    }
                });

            }
            // Remove the whole user
            else {
                user.remove(function (saveErr) {
                    if(saveErr) {
                        callback('Error deleting');
                    }
                    else {
                        Post.deleteByUser(userName);
                        callback(undefined, user);
                    }
                });
            }
                    
        }
    });
});


module.exports = mongoose.model('User', UserSchema);