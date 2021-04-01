const fetchJSON = require("./fetch.json");
module.exports = async (hash) => {
  return fetchJSON(`https://cloudflare-ipfs.com/ipfs/${hash}`);
};
