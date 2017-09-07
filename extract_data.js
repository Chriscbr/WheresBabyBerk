var natural = require('natural');
var locations = require('./locations');
var moment = require('moment');

// Regex used for tokenizing tweet text, used by parseTweet and parseText
var timeIntervalRegex = /((?:(?:\d{1,2}:\d\d)|(?:\d{1,2}))(?:(?:\s?-\s?)|\s?to\s?)(?:(?:\d{1,2}:\d\d)|(?:\d{1,2})))/g;

/*
Extracts data from a list of tweets obtained from the Twitter API.
Operates by checking for valid tweets, and passing on operation to parseTweet.
Output format:
{
  found: bool,
  places: [list of strings],
  times: [list of strings]
}
*/
exports.extractData = function (tweets) {
  console.log('Starting extractData...');
  // console.log(tweets);

  var output = {
    found: false,
    places: [],
    times: [],
    lastUpdate: ''
  };

  if (tweets.length > 0) {
    output = parseTweet(tweets[0], output);
    output = filterByTime(tweets[0], output, moment());
  } else {
    console.log('No tweets found.');
  }

  console.log('Data returned:')
  console.log(output);
  console.log('Finished extractData.');

  return output;
}

/*
Extracts data from an individual tweet obtained from the Twitter API.
Operates by tokenizing the tweet text into sections of time intervals and text
in between time intervals, and parses each token, adding to the data object.
Finally the data is checked for validity and returned if valid.
*/
function parseTweet(tweet, data) {
  console.log(tweet.user.screen_name + ' tweeted: "' + tweet.text + '"');

  // Assign lastUpdate to a timestamp of when the last tweet was.
  tweet_time = moment(tweet.created_at, 'ddd MMM DD HH:mm:ss Z YYYY');
  data.lastUpdate = tweet_time.format('MMMM Do YYYY, h:mm:ss a');
  console.log('Last update: ' + data.lastUpdate);

  // End parsing early if tweet is more than 12 hours old.
  if (!isRecent(tweet)) {
    console.log('Tweet is not recent enough to be shown.');
    return data;
  }

  // Begin tokenizing tweet's text into its components
  var completeText = tweet.text;
  var tokenizer = new natural.RegexpTokenizer({pattern: timeIntervalRegex});
  var components = tokenizer.tokenize(completeText);
  console.log('Tweet components: ');
  console.log(components);

  // Parse the text from each component into the data object
  for (var i = 0; i < components.length; i++) {
    data = parseText(components[i], data);
  }

  // If there was a positive number of times or locations found but they
  // weren't obtained in a 2:1 ratio, then the parsing is unsuccessful.
  if (2 * data.places.length !== data.times.length && data.places.length > 0) {
    console.log('Data extracted from tweet is invalid.');
    return data;
  }

  data.found = true;
  return data;
}

/*
Parses a "section" of tweet text, which is either a time interval
(i.e. "2:30-4") or a string of words in between those
There should only be one matching location in between each time interval
otherwise there cannot be a one-to-one location/time interval correspondence.
*/
function parseText(text, data) {

  function parseTime(str) {
    var times = str.match(/((?:\d{1,2}:\d\d)|(?:\d{1,2}))/g);
    if (!/(\d{1,2}:\d\d)/g.test(times[0])) {
      times[0] = times[0] + ':00';
    }
    if (!/(\d{1,2}:\d\d)/g.test(times[1])) {
      times[1] = times[1] + ':00';
    }
    output.times.push(times[0]);
    output.times.push(times[1]);
  }

  function parseWords(str) {
    var tokenizer = new natural.WordTokenizer();
    var words = tokenizer.tokenize(str);
    var match = '';
    var i = 0;

    /*
    TODO: improve processing control structure?
    The way the entire string is looped through, but exited by using
    multiple break statements seems janky. But I'm not entirely sure
    how to make it more elegant/simple.
    */

    while (i < words.length) { // loops through i words in string
      var curr = words[i];
      var diff = 0; // (0 = no match, 1 = exact match)

      // check for matching single word at index i
      for (var j = 0; j < locations.length; j++) {
        diff = natural.JaroWinklerDistance(curr, locations[j][0]);
        if (diff > 0.8) {
          match = locations[j][1];
          break;
        }
      }
      if (match != '') {
        console.log('"' + curr + '" matches to "' + match + '"');
        break;
      }

      // check for matching pair of words at indices i, i+1
      if (i + 1 < words.length) { // check that it isn't the last token
        curr = words[i] + ' ' + words[i+1];
        for (var j = 0; j < locations.length; j++) {
          diff = natural.JaroWinklerDistance(curr, locations[j][0]);
          if (diff > 0.8) {
            match = locations[j][1];
            break;
          }
        }
        if (match != '') {
          console.log('"' + curr + '" matches to "' + match + '"');
          break;
        }
      }

      i++;
    }

    // break statements ensure this line will be reached after first match
    if (match != '') {
      output.places.push(match);
    }

  }

  output = data;

  if (timeIntervalRegex.test(text)) { // case 1: time interval
    parseTime(text);
  } else {                            // case 2: non-time interval
    parseWords(text);
  }

  return output;
}

// checks if a tweet was made in the last 12 hours
function isRecent(tweet) {
  return moment(tweet.created_at, 'ddd MMM DD HH:mm:ss Z YYYY')
    .add(12, 'h')
    .isAfter(moment());
}

/* Removes data (place/time pairs) that end before the current time.
assumes that times listed in a tweet are within the 12 hour period after
its posting.
time: moment obj
tweet: tweet json
*/
function filterByTime(tweet, data, time) {
  var items = []; // indexes of items to remove

  for (var i=0; i<data.places.length; i++) {
    var endHour = data.times[i*2 + 1]; // ex. '6:30' or '12:00'
    var endTime = moment(endHour, 'h:mm');
    // console.log(endTime.format('ddd MMM DD HH:mm:ss'))
    var baseTime = moment(tweet.created_at, 'ddd MMM DD HH:mm:ss Z YYYY');

    // Add 12 hours up to 2 times until right time is found
    // (ex. 6pm tweet lists 2:00, can be corrected to 2am of next day)
    for (var j=0; j<2; j++) {
      if (endTime.isBefore(baseTime)) {
        endTime.add(12, 'h');
      }
    }
    console.log(endHour + ' interpreted as ' + endTime.format('ddd MMM DD HH:mm:ss'));
    if (endTime.isBefore(time)) {
      items.push(i);
    }
  }

  for (var i=items.length-1; i>=0; i--) {
    console.log('Removing ' + data.places[i]);
    data.places.splice(i, 1);
    data.times.splice(i*2, 2);
  }

  return data;
}
