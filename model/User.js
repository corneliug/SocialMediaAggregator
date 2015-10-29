var mongoose = require('mongoose'),
    random = require('mongoose-simple-random'),
    config = require('../config/config.js'),
    Post = require('./Post'),
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
    socrata: {
        frequency: {type: String, required: false},
        feeds: [FeedSchema]
    },
    foursquare: {
        frequency: {type: String, required: false},
        feeds: [FeedSchema]
    }
});

var UserSchema = new mongoose.Schema({
    name: {type: String, unique : true, required : true, dropDups: true},
    id: {type: String, unique : true, required : true, dropDups: true},
    date: Date,
    loc: {
        lat: {type: Number, required : true},
        lng: {type: Number, required : true}
    },
    agencies: [AgencySchema]
}, {
    collection: 'sma_users'
});

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
            // Run through included agencies
            _.forEach(agencies, function(newAgencyData) {
                // exists?
                var present = false;
                // Run through user's current agencies, update
                _.forEach(user.agencies, function(userAgency, agencyKey) {
                    // Agency exists
                    if(newAgencyData.name == userAgency.name) {
                        // Run through services
                        _.forEach(newAgencyData, function(accounts, serviceKey) {
                            if(serviceKey == 'name') {
                                return true;
                            }
                            // delete existing
                            if(deleteMode) {
                                // Grab items to delete
                                var toDelete = _.intersection(accounts, userAgency[serviceKey]);
                                _.forEach(toDelete, function(deleting) {
                                    // @TODO delete posts
                                    Post.deleteByUserAndPlatformAndAccount(userName, serviceKey, deleting);
                                    console.log("Deleting posts for:" + deleting);
                                });
                                // Set difference
                                user.agencies[agencyKey][serviceKey] = _.difference(accounts, userAgency[serviceKey]);
                            }
                            // update
                            else {
                                // Combine
                                user.agencies[agencyKey][serviceKey] = _.union(accounts, userAgency[serviceKey]);
                            }
                        });

                        present = true;
                        // break out
                        return false;
                    }

                });
                // Wasn't present so add to user
                if(!present) {
                    //var agency = $that.agencyPopulate(newAgencyData);
                    user.agencies.push(newAgencyData);
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
            NewUser.agencies = [];
            // Create a new agency for each entry
            _.forEach(data.agencies, function(agencyData) {
                //var agency = $that.agencyPopulate(agencyData);
                NewUser.agencies.push(agencyData);
            });
            NewUser.save(function (saveErr) {
                if(saveErr) {
                    callback('Save error');
                }
                else {
                    callback(undefined, NewUser);
                }
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