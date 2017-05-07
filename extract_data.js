var natural = require('natural');

var known_locations = [
['ohill', 'Orchard Hill'],
['o. hill', 'Orchard Hill'],
['o-hill', 'Orchard Hill'],
['orchard hill', 'Orchard Hill'],
['hampden', 'Hampden'],
['kennedy',, 'Kennedy'] 
['northeast', 'Northeast'],
['ne', 'Northeast'],
['lgrc', 'LGRC'],
['haigis', 'Haigis'],
['design building', 'Design Building'],
['design build', 'Design Building'],
['design', 'Design Building'] 
['southwest', 'Southwest'],
['southwest horseshoe', 'Southwest'],
['fleet services', 'Fleet Services'],
['whitmore', 'Whitmore'] 
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
['farmers market', 'Farmers Market'] 
['north apartments', 'North Apartments']
]

exports.extract_data = function (tweets) {
  console.log('Begin extract_data...');
  var out = {found: false,
             places: [],
             times: []};

  var regexp = /((?:(?:\d{1,2}:\d\d)|(?:\d{1,2}))(?:(?:\s?-\s?)|\s?to\s?)(?:(?:\d{1,2}:\d\d)|(?:\d{1,2})))/g;
  var parse = function(str) {
    if (regexp.test(str)) { // if it is a time
      times = str.match(/((?:\d{1,2}:\d\d)|(?:\d{1,2}))/g)
      if (!/(\d{1,2}:\d\d)/g.test(times[0])) {
        times[0] = times[0] + ':00';
      }
      if (!/(\d{1,2}:\d\d)/g.test(times[1])) {
        times[1] = times[1] + ':00';
      }
      out.times.push(times[0]);
      out.times.push(times[1]);
    } else {
      var tokenizer = new natural.WordTokenizer();
      var words = tokenizer.tokenize(str);
    }
  }

  if (tweets != null && tweets.hasOwnProperty('statuses')) {
    var tweet_text = tweets.statuses[0].text;
    var tokenizer = new natural.RegexpTokenizer({pattern: regexp});
    var sections = tokenizer.tokenize(tweet_text);
    for (var i=0; i<sections.length; i++) {
      parse(sections[i]);
    }

    tweet_time_str = tweets.statuses[0].created_at; // ex. Sat May 06 02:27:46 +0000 2017
    tweet_time = new Date(
      tweet_time_str.replace(/^\w+ (\w+) (\d+) ([\d:]+) \+0000 (\d+)$/,
      "$1 $2 $4 $3 UTC"));
    twelve_hrs_passed = new Date(tweet_time.getTime() + 60000 * 60 * 12); // adds 12 hours
    curr_time = new Date();

    if (2 * out.places.length == out.times.length && curr_time < twelve_hrs_passed) {
      out.found = true;
    }
  }
  console.log('Finish extract_data. Data returned: ');
  console.log(out);

  return out;
}