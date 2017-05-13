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

var timeIntervalRegex = /((?:(?:\d{1,2}:\d\d)|(?:\d{1,2}))(?:(?:\s?-\s?)|\s?to\s?)(?:(?:\d{1,2}:\d\d)|(?:\d{1,2})))/g;

exports.extractData = function (tweets) {
  console.log('Begin extractData...');

  var out;

  if (tweets != null && tweets.hasOwnProperty('statuses')) {
    out = parseTweet(tweets.statuses[0]);
  } else {
    out = {
      found: false
    };
  }
  console.log('Finished extractData. Data returned:');
  console.log(out);

  return out;
}

function parseTweet(tweet) {
  var out = {
    found: false,
    places: [],
    times: []
  };

  var tweet_text = tweet.text;

  console.log('Tweet text: ' + tweet_text);
  console.log('Tweet author: ' + tweet.user.screen_name);

  var tokenizer = new natural.RegexpTokenizer({pattern: timeIntervalRegex});
  var sections = tokenizer.tokenize(tweet_text);
  for (var i = 0; i < sections.length; i++) {
    out = parse(sections[i], out);
  }

  tweet_time_str = tweet.created_at; // ex. Sat May 06 02:27:46 +0000 2017
  tweet_time = new Date(
    tweet_time_str.replace(/^\w+ (\w+) (\d+) ([\d:]+) \+0000 (\d+)$/,
    "$1 $2 $4 $3 UTC"));
  twelve_hrs_passed = new Date(tweet_time.getTime() + 60000 * 60 * 12); // adds 12 hours
  curr_time = new Date();

  if (2 * out.places.length == out.times.length && curr_time < twelve_hrs_passed) {
    out.found = true;
  }

  return out;
}

// parses a "section" of tweet text, which is either a time interval
// (i.e. "2:30-4") or a string of words in between those
// intuitively, there should only be one match in between each time interval
function parse(str, out) {
  newOut = out;

  if (timeIntervalRegex.test(str)) { // if it is a time

    times = str.match(/((?:\d{1,2}:\d\d)|(?:\d{1,2}))/g);
    if (!/(\d{1,2}:\d\d)/g.test(times[0])) {
      times[0] = times[0] + ':00';
    }
    if (!/(\d{1,2}:\d\d)/g.test(times[1])) {
      times[1] = times[1] + ':00';
    }
    newOut.times.push(times[0]);
    newOut.times.push(times[1]);

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
      newOut.places.push(match);
    }

  }

  return newOut;
}