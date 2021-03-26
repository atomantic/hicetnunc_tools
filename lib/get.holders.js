const config = require("../config");
const fetchJSON = require("./fetch.json");
module.exports = (id) =>
  fetchJSON(
    `https://api.better-call.dev/v1/contract/mainnet/${config.nftContract}/tokens/holders?token_id=${id}`
  );
