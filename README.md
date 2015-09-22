Social platforms data aggregator
==============================

The application extracts data from 4 platforms (Facebook, Twitter, Instagram, Youtube), by profile or tag/search terms and then exposes the data through an REST API.

## Installation steps:

1. Clone app
2. Update config file, modifying db and instagram credentials, and youtube API access token(which you get from Google developer console)
   Additionally, in the config file the following params can be modified:
   - frequency: the frequency of running platform data aggregators (in seconds)
   - postsLimit: max number of recent records to be fetched from each platform per request
   - feedLimit: max number of records to be returned by the API on each call
   - logging_level: logging level inside app. Possible values: debug, info.
   
3. Run docker-compose up
4. Authenticate the app with Instagram by opening a browser on the url: http://localhost:8080/instagram/authenticate. This step must be followed just once, as the access token is saved in the config file and reused after this.

## Social platforms limitations

The social platforms have limitations to the number of requests to be accepted hourly. Those are as follows:

- Facebook: 600 calls/600 seconds. The application makes 2 calls to get one profile post.
- Instagram: 5000/hour. The application makes 1 call to get one post.
- Twitter: for tag posts  - 450/15 mins. The application makes 1 call to get one tag post.
		 for user posts - 300/15 mins. The application makes 1 call to get one profile post.
- Youtube: 50,000,000 units/day. The application uses about 8 units to get one post. So there are aproximately 600.000 calls/day.

## Mongo 

There are 2 collections for this repo.  

### User schema
```json
{
    name: {type: String, unique : true, required : true, dropDups: true},
    date: Date,
    agencies: [
      {
          name: {type: String, required : true},
          facebook: Array,
          instagram: Array,
          twitter: Array,
          youtube: Array
      }
    ]
}
```

### Post schema
```json
{
    id: {type: String, unique : true, required : true, dropDups: true},
    date: Date,
    date_extracted: Date,
    service: String,
    account: String,
    userName: String,
    agencyName: String,
    match: String,
    icon: String,
    url: String,
    text: String,
    likes: Number,
    agg_user: String
  }
```

## Sample API requests/responses


- Create User **Requires auth**
```sh
curl -u USERNAME -X POST -H "Content-Type: application/json" -d '{
    "name": "issaquah_wa",
    "agencies": [
      {
        "name": "default",
        "twitter":[
           "@albatrossdigi"
        ],
        "facebook":[
           "@DonaldTrump"
        ],
        "youtube": [
          "@SenatorSanders"
        ],
        "instagram": [
          "@github"
        ]
      }
    ]
}' 'http://localhost:8084/user/create'
```

- Run Aggregator for user **Requires auth**
```sh
curl -u USERNAME -X GET -H "Content-Type: application/json" 'http://localhost:8080/user/newyork_ny/aggregate'
```

- Update User **Requires auth**
```sh
curl -u USERNAME -X POST -H "Content-Type: application/json" -d '{
    "name": "issaquah_wa",
    "agencies": [
      {
        "name": "default",
        "twitter":[
           "@albatrossdigi",
           "#govtech"
        ]
      }
    ]
}' 'http://localhost:8084/user/update'
```

- Remove social account + posts **Requires auth**
```sh
curl -u USERNAME -X POST -H "Content-Type: application/json" -d '{
    "name": "issaquah_wa",
    "agencies": [
      {
        "name": "default",
        "facebook":[
           "@cristiano"
        ]
      }
    ],
    "deleteMode": "true"
}' 'http://localhost:8084/user/update'
```

- Delete user agency + posts **Requires auth**
```sh
curl -u USERNAME -X POST -H "Content-Type: application/json" -d '{
    "name": "issaquah_wa",
    "agencies": [
      "default"
    ]
}' 'http://localhost:8084/user/delete'
```

- Delete user + posts **Requires auth**
```sh
curl -u USERNAME -X POST -H "Content-Type: application/json" -d '{
    "name": "issaquah_wa"
}' 'http://localhost:8084/user/delete'
```

- Get feed for all user agencies
-- in form /api/:user/feed/
```sh
curl -X GET -H "Content-Type: application/json" 'http://localhost:8080/api/issaquah_wa/feed'
```

- Get feed for user agency
-- in form /api/:user/feed/:agency
```sh
curl -X GET -H "Content-Type: application/json" 'http://localhost:8080/api/issaquah_wa/feed/default'
```

- Get feed with criteria
```sh
curl -X GET -H "Content-Type: application/json" 'http://localhost:8080/api/issaquah_wa/feed/default?services[]=facebook'
```

Response sample:

```json
[
  {
    "_id": "55dcb3aa89981e102ae35540",
    "icon": "https://scontent.cdninstagram.com/hphotos-xfa1/t51.2885-19/s150x150/11429711_791379507647513_837496278_a.jpg",
    "url": "https://instagram.com/p/60P7cbTcWr/",
    "likes": 0,
    "text": "Closeup of glitter heels today ;) #shoes #aquazzura #glitter #shoeholic #shoeaholic #metallic #opentoe #shoeaddict #shoeaddiction #shoeobsessed #shoequeen #iloveshoes #highheels #heels #stilettos #feet #foot #prettyfeet #prettytoes #footmodel #fashion #fashionista #personalstyle #fashionblog #fashionblogger #fashionaddict #fashionobsessed #confessionsofafashionista",
    "match": "#shoes",
    "account": "klaudia.capalbo",
    "service": "instagram",
    "date_extracted": "2015-08-25T18:27:54.328Z",
    "date": "2015-08-25T18:27:35.000Z",
    "id": "1059541868008555947_1395949976",
    "agencyName": "default",
    "userName": "issaquah_wa",
    "__v": 0
  },
  {
    "_id": "55dcb3aa89981e102ae35544",
    "icon": "https://scontent.cdninstagram.com/hphotos-xaf1/t51.2885-19/s150x150/11848818_967832496572791_1103586277_a.jpg",
    "url": "https://instagram.com/p/60P7JLGdcj/",
    "likes": 0,
    "text": "summer look :)\n#newdress #blue #fashion #photo #austria #lake #tristach #water #longhair #longhairdontcare #lookbook #black #shoes #mango #outfitoftheday #photograph",
    "match": "#shoes",
    "account": "mira_nu",
    "service": "instagram",
    "date_extracted": "2015-08-25T18:27:54.331Z",
    "date": "2015-08-25T18:27:32.000Z",
    "id": "1059541847335622435_1513031652",
    "agencyName": "default",
    "userName": "issaquah_wa",
    "__v": 0
  }
]
```
