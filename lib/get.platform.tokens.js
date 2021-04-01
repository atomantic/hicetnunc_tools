/**
 * fetch all tokens minted on the platform
 *
 * NOTE: count of all tokens can be fetched: https://api.better-call.dev/v1/contract/mainnet/KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton/tokens/count
 * tokens can be fetched in batches of 10 from
 * https://api.better-call.dev/v1/contract/mainnet/KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton/tokens?offset=10
 */
const config = require("../config");
const fetchJSON = require("./fetch.json");
module.exports = async (offset) => {
  const tokens = await fetchJSON(
    `https://api.better-call.dev/v1/contract/mainnet/${config.nftContract}/tokens?offset=${offset}`
  );
  return tokens;
};
