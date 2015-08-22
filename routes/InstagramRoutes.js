var express = require('express'),
    request = require('request'),
    api = require('instagram-node').instagram(),
    InstagramAggregator = require('../social_media_aggregator/data_extractors/InstagramAggregator'),
    router = express.Router();

var redirect_uri = 'http://localhost:8080/instagram/authcallback';

router.get('/authenticate', function(req, res) {
    console.log("authenticate");
    api.use({client_id: config.apps.instagram.key,
             client_secret: config.apps.instagram.secret});

    res.redirect(api.get_authorization_url('http://localhost:8080/instagram/authcallback'));
});

router.get('/authcallback', function(req, res) {
    api.authorize_user(req.query.code, redirect_uri, function(err, result) {
        console.log("auth callback " + result.access_token);

        if (err) {
            console.log(err.body);
        } else {
            sessions.instagram = result.access_token;
            InstagramAggregator.aggregateData();
        }

        res.send("authenticated");
    });
});

module.exports = router;