var express = require('express'),
    User = require('./User'),
    fs = require('fs'),
    cheerio = require('cheerio'),
    request = require('request'),
    _       = require('lodash');

    exports.getUserDetails = function(user, callback){
    var $that = this;

    $that.getLatLng(user, function(user){
        $that.getGeoData(user, function(user){
            $that.getWikiInfo(user, function(user){
                $that.getRepresentatives(user, function(user){
                    callback(user);
                });
            });
        });
    });
}

exports.getLatLng = function(user, callback){
    if((user)){
        var url = "https://maps.googleapis.com/maps/api/place/textsearch/json?";

        url += "query=" + user.name;
        url += "&key=" + config.apps.google.key;

        request({
            url: url,
            method: 'GET'
        }, function(error, response, body) {
            if(error || !body || !response) {
                return callback(user);
            } else {
                body = JSON.parse(body);

                if(body!=undefined && body.results!=undefined && body.results.length!=0){
                    var location = body.results[0].geometry.location;
                    user.lat = location.lat;
                    user.lng = location.lng;
                }

                callback(user);
            }
        });
    } else {
        callback(user);
    }
}

exports.getGeoData = function(user, callback){
    if(!isCity(user)){
        User.findUserById(user.parent, function(err, usr){
            if(usr!=undefined){
                var geoJsonUrl = usr.geojsonUrl;
                var geoJsonUrl = 'https://raw.githubusercontent.com/substack/oakland-neighborhoods/master/neighborhoods.geojson';

                request({
                    url: geoJsonUrl,
                    method: 'GET'
                }, function(error, response, body) {
                    var geoData = JSON.parse(body);

                    if(geoData.features!=undefined){
                        var geoDataExtracted = false;
                        var gIndex = 0;

                        while(!geoDataExtracted && gIndex<geoData.features.length){
                            if(geoData.features[gIndex].properties.name == user.label){
                                geoDataExtracted = true;

                                user.geometry = geoData.features[gIndex].geometry;

                            } else {
                                gIndex++;
                            }
                        }
                    }

                    callback(user);
                });
            } else {
                callback(user);
            }
        });
    } else {
        callback(user);
    }
}

exports.getWikiInfo = function(user, callback){
    if(!isCity(user)){
        var NOK_TEASER_MATCHES = ["Coordinates:"];
        user.wikipediaUrl = 'https://en.wikipedia.org/wiki/' + user.name;

        request({
            uri: user.wikipediaUrl,
        }, function(error, response, body) {
            if(error==null && body!=undefined) {
                var $ = cheerio.load(body);
                var pLength = $("#mw-content-text p").length;

                var teaserExtracted = false;
                var teaserPInd = 0;
                var pTeaser = "";

                while(!teaserExtracted && teaserPInd<pLength){
                    pTeaser = $("#mw-content-text p").eq(teaserPInd).text();
                    var matchOk = true;

                    _.forEach(NOK_TEASER_MATCHES, function(nokMatch){
                        if(pTeaser.match(nokMatch)){
                            matchOk = false;
                        }
                    });

                    if(matchOk){
                        teaserExtracted = true;
                    }

                    teaserPInd++;
                }

                user.teaser = pTeaser;

                var imgSrc = $("#mw-content-text table.infobox.vcard tr td a.image img").eq(0).attr("src");
                user.image = imgSrc;

                var pDescription = $("#mw-content-text");
                pDescription.find("#coordinates, .infobox, #toc, .mw-editsection, .noprint, .thumb, #References, .reflist, .navbox").remove();
                user.description = pDescription.html();

                var location = $("#mw-content-text > table.infobox.geography.vcard > tbody > tr.mergedbottomrow > td > span > span.plainlinks.nourlexpansion > span > a span.geo").text();

                if(location!=undefined && location!=""){
                    location = location.split(";");

                    user.lat = location[0].trim();
                    user.lng = location[1].trim();
                }

            }

            callback(user);
        });
    } else {
        callback(user);
    }
}


exports.getRepresentatives = function(user, callback){
    if(user.lat!=undefined && user.lng!=undefined) {
        var $that = this;
        var url = "https://www.googleapis.com/civicinfo/v2/representatives?";
        url += "address=" + user.lat + "%2C" + user.lng;
        url += "&key=" + config.apps.google.key;

        request({
            url: url,
            method: 'GET'
        }, function(error, response, body) {
            if(error || !body || !response) {
                return callback(user);
            } else {
                body = JSON.parse(body);

                var state = body.normalizedInput.state;
                var offices = body.offices;
                var officials = body.officials;

                offices = $that.sortOfficesBasedOnState(offices, state, user.type == 'neighborhood');

                _.forEach(offices, function(office){
                    _.forEach(office.officialIndices, function(officIdx){
                        var official = officials[officIdx];

                        var repres = {};
                        repres.officeName = office.name;
                        repres.divisionId = office.divisionId;
                        repres.name = official.name;
                        repres.address = official.address;
                        repres.party = official.party;
                        repres.phones = official.phones;
                        repres.urls = official.urls;
                        repres.channels = official.channels;

                        user.representatives.push(repres);
                    });
                });

                callback(user);
            }
        });
    } else {
        callback(user);
    }
}

exports.sortOfficesBasedOnState = function(offices, state, isNeighbourhood){
    var sortedOffices = [];
    var matcher = '/state:' + state;
    matcher = matcher.toLocaleLowerCase();

    _.forEach(offices, function(office){
        if(isNeighbourhood){
            if(office.divisionId.toLowerCase().indexOf(matcher) != -1 && office.divisionId.match(/[A-z-:]+\/country:[A-z]+\/state:[A-z]+\/[A-z:]+\/[A-z:]+/)){
                sortedOffices.push(office);
            }
        } else {
            if(office.divisionId.toLowerCase().indexOf(matcher) != -1 && office.divisionId.match(/[A-z-:]+\/country:[A-z]+\/state:[A-z]+\/[A-z:]+$/)){
                sortedOffices.push(office);
            }
        }
    });

    return sortedOffices;
}

var isCity = function(user){
    return user.type == 'city';
}
