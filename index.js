var express = require('express');
var app = express();
var Twitter = require('twitter');
var natural = require('natural');

var client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

var bb1;
var bb1text;
var bb1parse;
var data1 = {found: true,
            places: ['Northeast', 'Kennedy', 'Hampden'],
            times: ['6:00', '8:00', '8:15', '10:00', '10:15', '12:00']}
var data2 = {found: true,
             places: ['Orchard Hill', 'Kennedy', 'Hampden'],
             times: ['8:15', '10:00', '10:15', '12:00', '12:15', '2:00']}

client.get('search/tweets', {q: 'from:UMassBabyBerk'}, function(error, tweets, response) {
  bb1 = tweets;
  console.log(tweets);

  bb1text = bb1.statuses[0].text;
  tokenizer = new natural.RegexpTokenizer({pattern: /((?:(?:\d{1,2}:\d\d)|(?:\d{1,2}))(?:(?:\s?-\s?)|\s?to\s?)(?:(?:\d{1,2}:\d\d)|(?:\d{1,2})))/g});
  bb1words = tokenizer.tokenize(bb1text);
  // data.places = bb1words.join();
  // data.found = true;
});

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  var content1 = data1;
  var content2 = data2;
  response.render('pages/index', {
    content1: content1,
    content2: content2
  });
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});


