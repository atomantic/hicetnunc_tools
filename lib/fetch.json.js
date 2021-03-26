const url = require("url");

module.exports = (uri, opts = {}) =>
  new Promise((resolve, reject) => {
    // select http or https module, depending on reqested url
    const uriParts = url.parse(uri);
    const https = uriParts.protocol === "https:";
    const lib = https ? require("https") : require("http");
    const port = https ? 443 : 80;
    const path = uriParts.path;
    const body = opts.body ? JSON.stringify(opts.body) : undefined;
    const headers = opts.body
      ? {
          "Content-Type": "application/json",
          "Content-Length": body.length,
        }
      : undefined;
    const options = {
      ...{
        hostname: uriParts.hostname,
        port,
        path,
        method: "GET",
        headers,
      },
      ...opts,
    };
    const request = lib.request(options, (response) => {
      // handle http errors
      if (response.statusCode < 200 || response.statusCode > 299) {
        console.log(response.statusCode, options);
        reject(
          new Error("Failed to load page, status code: " + response.statusCode)
        );
      }
      // temporary data holder
      const body = [];
      // on every content chunk, push it to the data array
      response.on("data", (chunk) => body.push(chunk));
      // we are done, resolve promise with those joined chunks
      response.on("end", () => {
        try {
          resolve(JSON.parse(body.join("")));
        } catch (e) {
          reject(e);
        }
      });
    });
    // handle connection errors of the request
    request.on("error", (err) => reject(err));
    if (body) request.write(body);
    request.end();
  });
