const fetchJSON = require("./fetch.json");
module.exports = (hash) =>
  fetchJSON("https://cloudflare-ipfs.com/ipfs/" + hash);
