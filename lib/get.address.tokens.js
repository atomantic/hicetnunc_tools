/**
 * fetch all tokens for a given address (created/collected)
 */
const { ConseilOperator } = require("conseiljs");
const config = require("../config");
const filterUnique = require("./filter.unique");
const getAllBCD = require("./get.all.bcd");
module.exports = async (address) => {
  // the original hicetnunc-api was fetching ALL the tokens/swaps
  // which gets less scalable as the platform adds more and more tokens
  // instead, let's just ask for all the token swap activity for this specific wallet
  // then we can filter it down and get the status of each token from another API
  const transfers = await getAllBCD(
    `https://api.better-call.dev/v1/tokens/mainnet/transfers/${address}?contracts=${config.nftContract}`,
    "transfers"
  );

  console.log(`found ${transfers.length} transfers`);

  // we only care about the hicetnunc contracts
  const filtered = transfers.filter(
    (xfer) => xfer.contract === config.nftContract
  );

  // now we split into collected and created
  // yeah, this is inneficient to do 3 loops but I'm lazy and the perf is negligible
  const collected = filtered
    .map((xfer) => (xfer.parent === "collect" ? xfer.token_id : null))
    .filter(filterUnique) // only care about unique token_ids
    .filter((i) => i); // remove nulls

  // the things we created have been swapped and canceled
  // note: this will change when the resale market opens
  // then, we'll need to compare the source wallet and dest wallet
  const created = filtered
    .map((xfer) => (xfer.parent === "swap" ? xfer.token_id : null))
    .filter(filterUnique) // only care about unique token_ids
    .filter((i) => i); // remove nulls

  // keeping for reference
  // my original plan was to replay the transactions over time to figure
  // out where everything is, but we don't know how many tokens were created
  // only swaps/cancels after creation
  // might revisit this to make it easier on the API

  // const created = {};
  // // replay swap actions in time to figure out where everything is
  // for (let i = 0, len = createdTransactions.length; i < len; i++) {
  //   const txn = createdTransactions[i];
  //   // for some reason, this is the only numeric field stored as a string
  //   txn.amount = Number(txn.amount);
  //   console.log(
  //     `${txn.parent} ${txn.token_id} x${txn.amount} from ${txn.from} to ${txn.to}`
  //   );
  //   if (!created[txn.token_id]) {
  //     created[txn.token_id] = txn;
  //     continue;
  //   }
  // }

  return { collected, created };
};
