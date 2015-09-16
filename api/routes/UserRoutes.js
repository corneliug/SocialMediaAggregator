var express = require('express'),
    request = require('request'),
    User = require('../../model/User'),
    config = require('../../config/config.js'),
    async = require('async'),
    fs = require('fs'),
    _ = require('lodash'), 
    router = express.Router();

router.route('/create')
    .post(function(req, res) {
        var payload = req.body;
        console.log(payload);
        if(_.has(payload, 'name')) {
            var NewUser = new User();
            User.createUser(payload, NewUser, function(createError, user) {
                if(createError) {
                    res.status(500).json({ error: 'message' });
                }
                else {
                    res.json({response: 'success'});
                }
            });
        }
        else {
            res.status(500).json({ error: 'message' });
        }

    });

router.route('/update')
    .post(function(req, res) {
        var payload = req.body;
        if(_.has(payload, 'name')) {
            var deleteMode = payload.deleteMode ? true : false
            User.updateAgencies(payload.name, payload.agencies, function(createError, user) {
                if(createError) {
                    res.status(500).json({ error: 'message' });
                }
                else {
                    res.json({response: 'success'});
                }
            }, deleteMode);
        }
        else {
            res.status(500).json({ error: 'message' });
        }

    });

router.route('/delete')
    .post(function(req, res) {
        var payload = req.body;
        if(_.has(payload, 'name')) {
            User.delete(payload.name, payload.agencies, function(createError, user) {
                if(createError) {
                    res.status(500).json({ error: 'message' });
                }
                else {
                    res.json({response: 'success'});
                }
            });
        }
        else {
            res.status(500).json({ error: 'message' });
        }
    });

module.exports = router;