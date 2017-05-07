var express = require('express');
var app = express();
var Twitter = require('twitter');
var interpret = require('./extract_data')

var client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

var bb1_tweets, bb2_tweets, bb1_data, bb2_data;

client.get('search/tweets', {q: 'from:UMassBabyBerk'}, function(error, tweets, response) {
  if (error) {
    console.log('Error thrown from Twitter API Search query "from:UMassBabyBerk"')
  }
  bb1_tweets = tweets;
  console.log(tweets);
  bb1_data = interpret.extract_data(bb1_tweets);
});

client.get('search/tweets', {q: 'from:UMassBabyBerk2'}, function(error, tweets, response) {
  bb2_tweets = tweets;
  console.log(tweets);
  bb2_data = interpret.extract_data(bb2_tweets);
});

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/banner', {data: null});
});

app.get('/test', function(request, response) {
  var data1 = bb1_data;
  var data2 = bb2_data;
  // console.log(data1);
  // console.log(data2);
  response.render('pages/index', {
    content1: data1,
    content2: data2
  });
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});


