var natural = require('natural');

var known_locations = [
['ohill', 'Orchard Hill'],
['o. hill', 'Orchard Hill'],
['o-hill', 'Orchard Hill'],
['orchard hill', 'Orchard Hill'],
['hampden', 'Hampden'],
['kennedy', 'Kennedy'],
['northeast', 'Northeast'],
['lgrc', 'LGRC'],
['haigis', 'Haigis'],
['design building', 'Design Building'],
['design build', 'Design Building'],
['design', 'Design Building'],
['southwest', 'Southwest'],
['southwest horseshoe', 'Southwest'],
['fleet services', 'Fleet Services'],
['whitmore', 'Whitmore'],
['softball', 'Softball'],
['umass softball', 'Softball'],
['baseball', 'Baseball'],
['umass baseball', 'Baseball'],
['curry hicks', 'Curry Hicks'],
['student union', 'Student Union'],
['umpd', 'UMPD'],
['goodell', 'Goodell'],
['mullins', 'Mullins'],
['fine arts', 'Fine Arts Center'], 
['fac', 'Fine Arts Center'],
['lorden field', 'Lorden Field'],
['physical plant', 'Physical Plant'],
['curtain theatre', 'Curtain Theatre'],
['farmers market', 'Farmers Market'],
['north apartments', 'North Apartments'],
['durfee conservatory', 'Durfee Conservatory']
]

// Regex used for tokenizing tweet text, used by parseTweet and parseText
var timeIntervalRegex = /(?:(?:\d{1,2}:\d\d)|(?:\d{1,2}))(?:(?:\s?-\s?)|\s?to\s?)(?:(?:\d{1,2}:\d\d)|(?:\d{1,2}))/g;
var timeIntRegex = new RegExp(''
  + /(?:(?:\d{1,2}:\d\d)|(?:\d{1,2}))/g.source  // time1
  + /(?:(?:\s?-\s?)|\s?to\s?)/g.source          // '-' or 'to'
  + /(?:(?:\d{1,2}:\d\d)|(?:\d{1,2}))/g.source  // time2
);

/*
Extracts the desired data from a tweets object returned by the Twitter API.
Operates by checking for valid tweets, and passing on operation to parseTweet.
Example output value:
{
  found: bool,
  places: [list of strings],
  times: [list of strings]
}
*/
exports.extractData = function (tweets) {
  console.log('Begin extractData...');
  console.log(tweets);

  var output;

  if (tweets != null && tweets.hasOwnProperty('statuses') &&
      tweets.statuses.length > 0) {
    output = parseTweet(tweets.statuses[0]);
  } else {
    output = {
      found: false,
      places: [],
      times: []
    };
  }

  console.log('Finished extractData. Data returned:');
  console.log(output);

  return output;
}

/*

*/
function parseTweet(tweet) {
  console.log('Tweet text: ' + tweet.text);
  console.log('Tweet author: ' + tweet.user.screen_name);

  var data = {
    found: false, 
    places: [],
    times: []
  }

  var completeText = tweet.text;
  var tokenizer = new natural.RegexpTokenizer({pattern: timeIntervalRegex});
  var sections = tokenizer.tokenize(completeText);
  for (var i = 0; i < sections.length; i++) {
    data = parseText(sections[i], data);
  }

  // return no data found if data is invalid
  if (!(2 * data.places.length === data.times.length && isRecent(tweet))) {
    return {
      found: false,
      places: [],
      times: []
    };
  } else {
    return convertData(data);
  }
}

// parses a "section" of tweet text, which is either a time interval
// (i.e. "2:30-4") or a string of words in between those
// intuitively, there should only be one match in between each time interval
function parseText(str, data) {
  output = data;

  if (timeIntervalRegex.test(str)) { // if it is a time

    times = str.match(/((?:\d{1,2}:\d\d)|(?:\d{1,2}))/g);
    if (!/(\d{1,2}:\d\d)/g.test(times[0])) {
      times[0] = times[0] + ':00';
    }
    if (!/(\d{1,2}:\d\d)/g.test(times[1])) {
      times[1] = times[1] + ':00';
    }
    output.times.push(times[0]);
    output.times.push(times[1]);

  } else {

    var tokenizer = new natural.WordTokenizer();
    var words = tokenizer.tokenize(str);
    var match = "";
    var i = 0;
    while (i < words.length) {
      var curr = words[i];
      var diff = 0;
      // check for matching single word at index i
      for (var j = 0; j < known_locations.length; j++) {
        diff = natural.JaroWinklerDistance(curr, known_locations[j][0]);
        if (diff > 0.8) {
          match = known_locations[j][1];
          break;
        }
      }
      if (match != '') {
        console.log('"' + curr + '" matches to "' + match + '"');
        break;
      }

      // check for matching pair of words at indices i, i+1
      if (i + 1 < words.length) {
        curr = words[i] + " " + words[i+1];
        for (var j = 0; j < known_locations.length; j++) {
          diff = natural.JaroWinklerDistance(curr, known_locations[j][0]);
          if (diff > 0.8) {
            match = known_locations[j][1];
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

    if (match != "") {
      output.places.push(match);
    }

  }

  return output;
}

// checks if a tweet was made in the last 12 hours
function isRecent(tweet) {
  var tweetTimeStr = tweet.created_at; // ex. Sat May 06 02:27:46 +0000 2017
  var tweetTime = new Date(
    tweetTimeStr.replace(/^\w+ (\w+) (\d+) ([\d:]+) \+0000 (\d+)$/,
    "$1 $2 $4 $3 UTC"));
  var tweetTimePlus12 = new Date(tweetTime.getTime() + 60000 * 60 * 12); // adds 12 hours
  var currTime = new Date();

  return currTime < tweetTimePlus12;
}

// converts list of locations and times into associative array
function convertData(data) {
  var places = data.places;
  var times = data.times;

  console.log('Converting data...');
  console.log(places);
  console.log(times);

  var output = {};
  for (var i = 0; i < data.places; i++) {
    output[places[i]] = [times[2*i + 1], times[2*i + 1]];
  }

  console.log('Output data:');
  console.log(output);

  return output;
}