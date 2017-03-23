//jshint browser: true
/*global cozy: true, rawAPI: true, sendEmail: true */


//-------
// Main
//-------
document.addEventListener('DOMContentLoaded', () => {
  "use strict";
  const app = document.querySelector('[role=application]').dataset;
  var options, myDocument, permissionsOptions;

  // Init CozyClient
  options = {
    cozyURL: `//${app.cozyDomain}`,
    token: app.cozyToken
  };
  cozy.client.init(options);

  // Init CozyBar
  window.cozy.bar.init({appName: app.appName});

  // Get instance settings
  rawAPI('/settings/instance')
  .then((res) => console.log("Instance settings", res))
  .catch((err) => console.error("Error getting instance settings", err));

  // Sample document lifecycle
  myDocument = {
    name: "My document's name",
    content: "My document's content"
  };
  // Create document
  cozy.client.data.create("io.cozy.dev.sample", myDocument)
  .catch((err) => { throw "Error creating content: " + err;})
  // Update some attributes
  .then((created) => {
    console.log("Document created: ", created);
    return cozy.client.data.updateAttributes("io.cozy.dev.sample", created._id, {content: "new content"});
  })
  .catch((err) => { throw "Error updating content: " + err;})
  // Delete document
  .then((updated) => {
    console.log("Document updated: ", updated);
    return cozy.client.data.delete("io.cozy.dev.sample", updated);
  })
  .catch((err) => { throw "Error deleting content: " + err;})
  .then((deleted) => {
    console.log("Document deleted: ", deleted);
  })
  .catch((err) => { console.error(err); });

  // Querying
  // Define an index
  cozy.client.data.defineIndex("io.cozy.dev.sample", ['_id'])
  .catch((err) => { throw "Error defining index: " + err;})
  // Query the index
  .then((index) => {
    console.log("Index: ", index);
    return cozy.client.data.query(index, {selector: {'_id': {'$gt': ''}}});
  })
  .catch((err) => { throw "Error querying: " + err;})
  .then((res) => {
    console.log("Query result: ", res);
  });

  // Send an email
  if (false) {
    sendEmail('contact@cozycloud.cc', 'Hello', 'Hello,\nHow are you?');
  }

  // Get a token for the public page
  permissionsOptions = {
    "data": {
      "type": "io.cozy.permissions",
      "attributes": {
        "permissions": {
          "sample": {
            "type": "io.cozy.dev.sample",
            "verbs": ["GET"]
          }
        }
      }
    }
  };
  rawAPI('/permissions?codes=public', 'POST', permissionsOptions)
  .catch((err) => { throw "Error requesting public token: " + err; })
  .then((res) => {
    console.log("New permissions: ", res);
    document.getElementById('public').setAttribute('href', `/public/#${res.data.attributes.codes.public}`);
    return rawAPI('/permissions/self');
  })
  .catch((err) => { throw "Error listing permissions: " + err; })
  .then((res) => { console.log("Permissions: ", res); });
});
