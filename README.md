Social platforms aggregator

A. Installation steps:

1) Clone app
2) Update config file, modifying db and instagram credentials, and youtube API access token(which you get from Google developer console)
   Additionally, in the config file the following params can be modified:
   - frequency: the frequency of running platform data aggregators (in seconds)
   - postsLimit: max number of recent records to be fetched from each platform per request
   - feedLimit: max number of records to be returned by the API on each call
   - logging_level: logging level inside app. Possible values: debug, info.
   
3) Run "npm install", in order to install application's dependencies
4) Run the application with "node app.js"
5) Authenticate the app with Instagram by opening a browser on the url: http://localhost:8080/instagram/authenticate. This step must be followed just once, as the access token is saved in the config file and reused after this.

B. Social platforms limitations

The social platforms have limitations to the number of requests to be accepted hourly. Those are as follows:

Facebook: 600 calls/600 seconds. The application makes 2 calls to get one profile post.
Instagram: 5000/hour. The application makes 1 call to get one post.
Twitter: for tag posts  - 450/15 mins. The application makes 1 call to get one tag post.
		 for user posts - 300/15 mins. The application makes 1 call to get one profile post.
Youtube: 50,000,000 units/day. The application uses about 8 units to get one post. So there are aproximately 600.000 calls/day.

C. Sample API requests/responses

1. Get feed
curl -X GET -H "Content-Type: application/json" 'http://localhost:8080/api/feed'

2. Get feed with criteria
curl -X POST -H "Content-Type: application/json" -d '{
   "accounts":{
      "twitter":[
         "#govtech"
      ],
      "facebook":[
         "@cristiano"
      ]
   }
}' 'http://localhost:8080/api/feed'

3. Delete criteria
curl -X POST -H "Content-Type: application/json" -d '{
   "accounts":{
      "twitter":[
         "@cristinnaciocoiu"
      ]
   }
}' 'http://localhost:8080/api/accounts/delete'

4. Add criteria
curl -X POST -H "Content-Type: application/json" -d '{
   "accounts":{
      "twitter":[
         "@cristinnaciocoiu"
      ]
   }
}' 'http://localhost:8080/api/accounts/add'


Response sample:

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
    "__v": 0
  }
]
