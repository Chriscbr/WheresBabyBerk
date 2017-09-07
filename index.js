var express = require('express');
var app = express();
var Twitter = require('twitter');
var interpret = require('./extract_data');

var client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

var bb1_data, bb2_data;

var getTweets = function() {
  client.get('statuses/user_timeline', {screen_name: 'UMassBabyBerk'}, function(error, tweets, response) {
    if (error) {
      console.log('Error thrown from Twitter API UMassBabyBerk Timeline:');
      bb1_data = {
        found: false
      };
      console.log(error);
    } else {
      console.log("Calling extractData for UMassBabyBerk...");
      bb1_data = interpret.extractData(tweets);
    }
  });

  client.get('statuses/user_timeline', {screen_name: 'UMassBabyBerk2'}, function(error, tweets, response) {
    if (error) {
      console.log('Error thrown from Twitter API UMassBabyBerk2 Timeline:');
      bb2_data = {
        found: false
      };
      console.log(error);
    } else {
      console.log("Calling extractData for UMassBabyBerk2...");
      bb2_data = interpret.extractData(tweets);
    }
  });
}

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/banner', {data: null});
});

app.get('/test', function(request, response) {
  response.render('pages/index', {
    content1: bb1_data,
    content2: bb2_data
  });
});

app.get('/menus', function(request, response) {
  response.render('pages/menus');
});

app.use('/images', express.static('images'));

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

// Check for new tweets every 5 minutes
getTweets();
var checkNewTweets = setInterval(function() {
  console.log('Current time: ' + new Date());
  getTweets();
}, 1000 * 60 * 5);
