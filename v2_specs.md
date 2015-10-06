# Feeds aggregator enhancements specs
Jeff Lyon, Oct 6 2015

Jeff to go over changes we have made to original script (https://github.com/proudcity/SocialMediaAggregator/tree/circa)
* Storing user accounts in sma_users mongodb collection
* Saving some keys (private) in .env file
* Geo-enabled database

### I. Changes to User mongodb collection

1. Change the format of each individual service (these are now stored in mongodb `sma_users` collection) from 
```
{
  "facebook": ["@cristiano", "#govtech"] 
}
```
to:
```
{
  "facebook": {
    "frequency": 3000,
    "feeds": [
      {
        "service": 
        "type": "account",
        "frequency": 24000, // overrides frequency on facebook-level
        "query": "cristiano"
      },
      {
        "service": 
        "type": "hashtag",
        "query": "govtech"
      }
    ]
  }
}
```

2. Allow some top-level user data to be stored:
  a) Location: geojson (`loc`)
  b) description: Text (Long)
  c) teaser: Text
  d) image: Url

**See attched User.json file for full example**


3. When creating a new User, automatically pull in data from:
* Wikipedia: Text and image (example: https://en.wikipedia.org/wiki/Rockridge,_Oakland,_California)
* Geojson file: (select relevant Feature from https://github.com/substack/oakland-neighborhoods)


II. Tweak existing feeds

1. Store lat/lng data when available as (see http://docs.mongodb.org/manual/reference/operator/query/near/)
```
post.loc = {
    type : "Point",
    coordinates : [<Float lng>, <Float lat>],
    address: <Array address components (if available)>
}
```


III. Add additional feeds

1. Socrata: (mostly implemented: https://github.com/proudcity/SocialMediaAggregator/blob/circa/social_media_aggregator/data_extractors/SocrataAggregator.js) no authentication necessary
* Docs: http://dev.socrata.com/
* Example: https://data.oaklandnet.com/Public-Safety/CrimeWatch-Maps-Past-90-Days/ym6k-rx7a
```
"socrata": {
  "frequency": 24000,
  "feeds": [
    {
      "type": "crime",
      "url": "https://data.oaklandnet.com/resource/ym6k-rx7a.json"
    }
  ]
}
```

2. Foursquare: (partially implemented: https://github.com/proudcity/SocialMediaAggregator/blob/circa/social_media_aggregator/data_extractors/FoursquareAggregator.js)
```
"foursquare": {
  "frequency": 240000,
  "feeds": [
    {
      "type": "schools",
      "url": "query"
    }
  ]
}
```
Example url (lat/lng comes from I.2.a above):
```
https://api.foursquare.com/v2/venues/explore?ll=44.5645659,-123.2620435&query=police%20station&client_id=xxx&client_secret=xxx&v=20140601
```

3. Open311/SeeClickFix
```
"open311": {
  "frequency": 24000,
  "zoom": 8, // map zoom level
  "per_page": 50,
  "feeds": [
    {
      "status": "open"
    },
    {
      "status": "closed"
    },
    {
      "status": "acknowledged"
    }
  ]
}
```
Example url (lat/lng comes from I.2.a above):
```
https://seeclickfix.com/api/v2/issues?lat=44.5645659&lng=-123.2620435&zoom=<zoom>&per_page=<per_page>&sort=created_at&status=status
```
See http://dev.seeclickfix.com/, http://seeclickfix.com/open311/v2/docs

4. GTFS (https://en.wikipedia.org/wiki/General_Transit_Feed_Specification)
* Code should be available in https://github.com/UlmApi/livemap
* Wipe all existing entries matching type on import
* Mostly interested in getting stops (with lat/lng) as feed items
``` 
"gtfs": {
  "frequency": 240000,
  "feeds": [
    {
      "type": "bart",
      "url": "http://www.bart.gov/dev/schedules/google_transit.zip"
    },
    {
      "type": "actransit",
      "url": "http://gtfs.s3.amazonaws.com/ac-transit_20150218_1708.zip"
    }
  ]
}
```


5. Yelp
* Requires oauth?
* Docs: https://www.yelp.com/developers/documentation/v2/search_api
* May eventually want lat/lng search (but not right now)
``` 
"yelp": {
  "frequency": 240000,
  "feeds": [
    {
      "type": "neighborhood",
      "location": ""
    },
    {
      "type": "actransit",
      "url": "http://gtfs.s3.amazonaws.com/ac-transit_20150218_1708.zip"
    }
  ]
}
```
Example request url
```
https://api.yelp.com/v2/search?location=Rockridge, Oakland&key=xxx
```

