const https = require("https");

function request(options, bodyString) {
  console.log(JSON.stringify({ options, bodyString }));
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      console.log(JSON.stringify({ statusCode: res.statusCode }));
      const chunks = [];

      res.on("data", (chunk) => {
        chunks.push(chunk);
      });

      res.on("end", () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", (e) => {
      reject(e);
    });
    if (bodyString != null) {
      req.write(bodyString);
    }
    req.end();
  });
}

module.exports = { request };
