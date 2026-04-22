var https = require('https');

var options = {
  host: 'dculnqqyxqtdynmcvqxk.supabase.co',
  path: '/rest/v1/moral_transactions?select=external_id&limit=1',
  method: 'GET',
  headers: {
    'apikey': 'sb_publishable_-eTufkNB4FGzdjoEIPJ6GQ_JKFc06fX',
    'Authorization': 'Bearer sb_publishable_-eTufkNB4FGzdjoEIPJ6GQ_JKFc06fX'
  }
};

var req = https.request(options, function(res) {
  var str = '';
  res.on('data', function (chunk) { str += chunk; });
  res.on('end', function () {
    console.log("RESPONSE:", res.statusCode, str);
  });
});
req.end();
