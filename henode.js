/**
 * HENode
 * persistent process that runs an IPFS cacher for all HEN tokens
 * bootstraps the whole network and then monitors new mints every 10 seconds
 *
 * DRY RUN (fetch and log but do not PIN) with `DRY=true node henode.js`
 * Full node: `node henode.js`
 * Meta-data only node: `node henode.js meta`
 *
 * additionally grabs updated blocklists to unpin/kill blocked items
 *
 * TODO: burning is a bit tricky because a token collector could have burned a 1/100 tokens
 * so the presense of a token in the burn address does not mean they are all burned.
 * For now, we are not unpinning burned tokens!
 */

const fs = require("fs");

// const getAddressTokens = require("./lib/get.address.tokens");
const getBlockedObj = require("./lib/get.blocked.obj");
const getBlockedTz = require("./lib/get.blocked.tz");
const getObjktMeta = require("./lib/get.objkt.meta");
const getPlatformTokens = require("./lib/get.platform.tokens");
// const getTz = require("./lib/get.tz");
const pin = require("./lib/ipfs.pin");

const metaOnly = process.argv[2] === "meta";

console.log(`Running HENode in ${metaOnly ? "meta only" : "full cache"} mode`);

const pinAsHash = async (value, action, prefix) => {
  await pin(value.replace("ipfs://", ""), action, prefix);
};

const pinObj = async (token, action) => {
  // each asset has 3 files:
  // "artifact_uri": "ipfs://Qmbdoe1ErgoHpVNsGRtqEmtaoqb3GGP5943zpP9KAQ4wQj",
  // "thumbnail_uri": "ipfs://QmNrhZHUaEqxhyLfqoq1mtHSipkWHeT31LNHb1QEbDHgnc",
  // "extras": {
  //   "@@empty": "ipfs://QmNk4MkbYo9rkwHBu1DAiQ6wGtHUzkNp1sbZpjvLLC7CoD"
  // }
  if (!metaOnly && token.token_info && token.token_info.artifactUri)
    await pinAsHash(
      token.token_info.artifactUri,
      action,
      `token:${token.token_id}-content`
    );
  if (!metaOnly && token.token_info && token.token_info.thumbnailUri)
    await pinAsHash(
      token.token_info.thumbnailUri,
      action,
      `token:${token.token_id}-thumb`
    );
  let extras = Object.values(token.extras);
  // in case there are more extras later:
  for (let j = 0; j < extras.length; j++) {
    await pinAsHash(extras[j], action, `token:${token.token_id}-meta`);
  }
};

const cacheFile = `${__dirname}/.cache.json`;

let cache = {
  bootstrapped: false,
  offset: 0,
  blockedObj: [],
  blockedTez: [],
  burned: [],
  pinned: [],
  unpinned: [],
};

const cacheFileExists = fs.existsSync(cacheFile);
if (!cacheFileExists) {
  fs.writeFileSync(cacheFile, JSON.stringify(cache));
} else {
  cache = JSON.parse(fs.readFileSync(cacheFile).toString());
}

console.log(
  `${
    cache.offset
      ? `resuming HENode with offset ${cache.offset} (${cache.pinned.length} cached already)`
      : "boostrapping HENode"
  } `
);

const updateBlockLists = async () => {
  const [blockedObj, blockedTez] = await Promise.all([
    getBlockedObj(),
    getBlockedTz(),
  ]);
  if (cache.blockedObj.length !== blockedObj.length) {
    console.log(
      `blocked object list updated with ${
        blockedObj.length - cache.blockedObj.length
      } new items`
    );
    // now ensure new items are unpinned
    // TODO: fetch from another source, getTz will not find this token
    // as it is blocked
    // for (let i = 0; i < blockedObj.length; i++) {
    //   if (
    //     !cache.blockedObj.includes(blockedObj[i]) &&
    //     !cache.unpinned.includes(blockedObj[i])
    //   ) {
    //     // get the object data
    //     const token = await getTz(token_id);
    //     await unpinObj(token);
    //   }
    // }
    cache.blockedObj = blockedObj;
  }
  if (cache.blockedTez.length !== blockedTez.length) {
    console.log(
      `blocked address list updated with ${
        blockedTez.length - cache.blockedTez.length
      } new items`
    );
    // todo: find the tokens created by this address and unpin them all
    cache.blockedTez = blockedTez;
  }
  cache.blockedObj;
};

// update the block lists every 1 minute
setInterval(updateBlockLists, 60000);

const setMonitorMode = async () => {
  console.log("bootstrapped! awaiting new mints");
  // the API is backward, so new content starts off at offset 0
  cache.offset = 0;
  // next time we load the engine, go straight into monitor mode
  cache.bootstrapped = true;
  // save cache history to disk for resuming
  fs.writeFileSync(cacheFile, JSON.stringify(cache));
  // check for new minted content in 10 seconds
  return setTimeout(getNextPage, 10000);
};

const getNextPage = async () => {
  const tokens = await getPlatformTokens(cache.offset);
  if (!tokens || !tokens.length) {
    return setMonitorMode();
  }
  let newItemsThisPage = 0;
  console.log(
    `${cache.pinned.length} pinned items. Fetched offset=${cache.offset} with ${
      tokens.length
    } tokens: ${tokens[tokens.length - 1].token_id} - ${tokens[0].token_id}`
  );
  for (let i = 0; i < tokens.length; i++) {
    let t = tokens[i];

    if (cache.pinned.includes(t.token_id)) {
      // we have now reached a place in the pagination that we have
      // already pinned (everything older than this pin should already be pinned)

      // NOTE: this API is backward (new mints will shift pagination)
      // so we can easily request a future page and get a token we've already seen :(
      // we would like to go into monitor mode now, but we might just have hit
      // a single token we processed last page
      // and still need to look at the next page
      // so instead of returning here into monitor mode, we will check to see if anything from this page was new
      // return setMonitorMode();
      continue;
    }
    newItemsThisPage++;

    if (!t.extras["@@empty"]) {
      console.error(`token does not appear to have a metadata block`, t.extras);
      continue;
    }

    t.token_info = await getObjktMeta(
      t.extras["@@empty"].replace("ipfs://", "")
    );
    let action = "add";
    if (
      cache.blockedObj.includes(t.token_id) ||
      cache.blockedTez.includes(t.token_info.creators[0])
    ) {
      console.log(`ensuring blocked token is not pinned: ${t.token_id}`);
      action = "rm";
    }

    await pinObj(t, action);

    if (action === "add") cache.pinned.push(t.token_id);
    else cache.unpinned.push(t.token_id);
  }
  // hard code hack here to only allow bootstrap status if we have pinned
  // at least 10K items to get around my own testing where I killed the bootstrap (later, we will use a better method)
  if (!newItemsThisPage && cache.pinned.length > 10000) {
    return setMonitorMode();
  }
  // increment page
  cache.offset += 10;
  // save cache history to disk for resuming
  fs.writeFileSync(cacheFile, JSON.stringify(cache));
  getNextPage();
};

(async () => {
  // initalize the blocklists
  await updateBlockLists();
  // start the engine
  if (cache.bootstrapped) setMonitorMode();
  else getNextPage();
})();
