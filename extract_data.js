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
  console.log('Begin extractData...');
  // console.log(tweets);

  var output = {
    found: false,
    places: [],
    times: [],
    lastUpdate: ""
  };

  if (tweets.length > 0) {
    output = parseTweet(tweets[0], output);
  }

  console.log('Finished extractData. Data returned:');
  console.log(output);

  return output;
}

/*
Extracts data from an individual tweet obtained from the Twitter API.
Operates by tokenizing the tweet text into sections of time intervals and text
in between time intervals, and parses each token, adding to the data object.
Finally the data is checked for validity and returned if valid.
*/
function parseTweet(tweet, data) {
  console.log('Tweet text: ' + tweet.text);
  console.log('Tweet author: ' + tweet.user.screen_name);

  var completeText = tweet.text;
  var tokenizer = new natural.RegexpTokenizer({pattern: timeIntervalRegex});
  var sections = tokenizer.tokenize(completeText);
  console.log('sections: ');
  console.log(sections);
  for (var i = 0; i < sections.length; i++) {
    data = parseText(sections[i], data);
  }

  if (!isRecent(tweet)) {
    console.log("Tweet is not recent enough to be shown.");
    return data;
  }
  if (2 * data.places.length !== data.times.length && data.places.length > 0) {
    console.log("Data extracted from tweet is invalid.");
    return data;
  }

  data.found = true;
  tweet_time = moment(tweet.created_at, "ddd MMM DD HH:mm:ss Z YYYY");
  data.lastUpdate = tweet_time.format("MMMM Do YYYY, h:mm:ss a");
  console.log(data.lastUpdate);
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
    var match = "";
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
        curr = words[i] + " " + words[i+1];
        for (var j = 0; j < locations.length; j++) {
          diff = natural.JaroWinklerDistance(curr, locations[j][0]);
          if (diff > 0.8) {
            match = locations[j][1];
            break;
          }
        }
        if (match != "") {
          console.log('"' + curr + '" matches to "' + match + '"');
          break;
        }
      }

      i++;
    }

    // break statements ensure this line will be reached after first match
    if (match != "") {
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
  return moment(tweet.created_at, "ddd MMM DD HH:mm:ss Z YYYY")
    .add(12, 'h')
    .isAfter(moment());
}
