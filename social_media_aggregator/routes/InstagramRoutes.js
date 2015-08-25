var express = require('express'),
    request = require('request'),
    api = require('instagram-node').instagram(),
    InstagramAggregator = require('../data_extractors/InstagramAggregator'),
    router = express.Router();

global.instagram_token = undefined;


router.get('/authenticate', function(req, res) {
    logger.log('debug', 'Authenticating to Instagram');
    api.use({client_id: config.apps.instagram.key,
             client_secret: config.apps.instagram.secret});

    res.redirect(api.get_authorization_url(config.apps.instagram.redirectUri));
});

router.get('/authcallback', function(req, res) {
    api.authorize_user(req.query.code, config.apps.instagram.redirectUri, function(err, result) {
        logger.log('debug', 'Authentication to Instagram was successful!');

        if (err) {
            console.log(err.body);
        } else {
            instagram_token = result.access_token;
            InstagramAggregator.aggregateData();
        }

        res.send("authenticated");
    });
});

module.exports = router;