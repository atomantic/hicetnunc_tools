/**
 * Which items are available for sale by an address?
 *
 * node available.js tz1iyFi4WjSttoja7Vi1EJYMEKKSebQyMkF9
 */
const config = require("./config");
const getHolders = require("./lib/get.holders");
const getTokens = require("./lib/get.address.tokens");
const reduceSum = require("./lib/reduce.sum");

const tz = process.argv[2];

const baseURL = `https://www.hicetnunc.xyz/objkt/`;

console.log(`⚡ fetching creation info for address ${tz}...`);

(async () => {
  const { created } = await getTokens(tz);

  const details = await Promise.all(
    created.map(async (token_id) => {
      const holders = await getHolders(token_id);
      return {
        token_id,
        holders,
        total: Object.values(holders).reduce(reduceSum),
      };
    })
  );

  details.sort((a, b) => (a.token_id < b.token_id ? -1 : 1));

  // console.log({ details });

  // items that are not owned by the protocol address are currently not for sale
  const soldOut = details.filter((o) => !o.holders[config.protocol]);

  // items that are owned by the protocol address are currently for sale
  const forSale = details.filter((o) => o.holders[config.protocol]);

  // items owned by the creator address can be listed (but are not)
  const canSell = details.filter((o) =>
    Object.keys(o.holders).find((h) => h === tz)
  );

  console.log(`🚫 Sold Out:`);
  soldOut.forEach((o) => console.log(`${baseURL}${o.token_id} 0/${o.total}`));
  console.log(`✅ For Sale:`);
  forSale.forEach((o) =>
    console.log(
      `${baseURL}${o.token_id} ${o.holders[config.protocol]}/${o.total}`
    )
  );
  console.log(`🏷️  Creator Can List:`);
  canSell.forEach((o) =>
    console.log(
      `${baseURL}${o.token_id} ${o.holders[tz]}/${o.total} ${
        forSale.find((s) => s.token_id === o.token_id) ? "" : "(NONE LISTED)"
      }`
    )
  );
})();
