//jshint browser: true
/* exported sendEmail */
//--------------
// Raw API call
//--------------
function rawAPI(url, method, body) {
  "use strict";
  var fetchOptions;
  fetchOptions = {
    method: method || 'GET',
    headers: {
      Authorization: `Bearer ${window.app.cozyToken}`,
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  };
  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }
  return new Promise(function (resolve, reject) {
    fetch(`//${window.app.cozyDomain}${url}`, fetchOptions)
    .then(function (response) {
      if (response.ok) {
        response.json().then((res) => {
          resolve(res);
        });
      } else {
        reject('Network response was not ok.');
      }
    })
    .catch(function (error) {
      reject('There has been a problem with your fetch operation: ' + error.message);
    });
  });
}

//---------------
// Send an email
//---------------
function sendEmail(to, subject, content) {
  "use strict";
  var mailOptions;
  mailOptions = {
    data: {
      arguments: {
        mode: "from",
        to: to,
        subject: subject,
        parts: [
          {
            type: "text/plain",
            body: content
          }
        ]
      },
      options: {}
    }
  };
  rawAPI('/jobs/queue/sendmail', 'POST', mailOptions)
  .then((res) => console.log("Mail sent", res))
  .catch((err) => console.error("Error sending email", err));
}

