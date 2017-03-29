//jshint browser: true
/*global cozy: true */

// Get token from URL
const token = window.location.hash.substr(1);
var app;

//-------
// Main
//-------
document.addEventListener('DOMContentLoaded', () => {
  "use strict";
  var options;
  app = document.querySelector('[role=application]').dataset;
  console.log(app);

  // Init CozyClient
  options = {
    cozyURL: `//${app.cozyDomain}`,
    token: token
  };
  cozy.client.init(options);

  // Define an index and list all documents
  cozy.client.data.defineIndex("io.cozy.dev.sample", ['_id'])
  .catch((err) => { throw "Error defining index: " + err;})
  .then((index) => {
    return cozy.client.data.query(index, {selector: {'_id': {'$gt': ''}}});
  })
  .catch((err) => { throw "Error querying: " + err;})
  .then((res) => {
    console.log("Query result: ", res);
  });
});
