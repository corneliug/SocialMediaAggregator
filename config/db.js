var mongoose = require('mongoose'),
    config   = require(__dirname + "/config.js");

mongoose.connect(config.db);

// Models
require("../model/Post.js");
require("../model/User.js");
