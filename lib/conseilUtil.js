const conseiljs = require("conseiljs");
const fetch = require("node-fetch");
const logger = require("./logger");

conseiljs.registerLogger(logger);
conseiljs.registerFetch(fetch);
const conseilServer = "https://conseil-prod.cryptonomic-infra.tech";
// rather than copy the API key from hicetnunc-api: https://github.com/hicetnunc2000/hicetnunc-api/blob/master/conseilUtil.js#L10
// set this as an ENV var (don't commit to git)
const conseilApiKey = process.env.CONSEIL_KEY; // signup at nautilus.cloud

const mainnet = require("../config");
/**
 * Returns a list of nft token ids and amounts that a given address owns.
 *
 * @param {string} address
 * @returns
 */
const getCollectionForAddress = async (address) => {
  let collectionQuery = conseiljs.ConseilQueryBuilder.blankQuery();
  collectionQuery = conseiljs.ConseilQueryBuilder.addFields(
    collectionQuery,
    "key",
    "value"
  );
  collectionQuery = conseiljs.ConseilQueryBuilder.addPredicate(
    collectionQuery,
    "big_map_id",
    conseiljs.ConseilOperator.EQ,
    [mainnet.nftLedger]
  );
  collectionQuery = conseiljs.ConseilQueryBuilder.addPredicate(
    collectionQuery,
    "key",
    conseiljs.ConseilOperator.STARTSWITH,
    [`Pair 0x${conseiljs.TezosMessageUtils.writeAddress(address)}`]
  );
  collectionQuery = conseiljs.ConseilQueryBuilder.addPredicate(
    collectionQuery,
    "value",
    conseiljs.ConseilOperator.EQ,
    [0],
    true
  );
  collectionQuery = conseiljs.ConseilQueryBuilder.setLimit(
    collectionQuery,
    10_000
  );

  const collectionResult = await conseiljs.TezosConseilClient.getTezosEntityData(
    { url: conseilServer, apiKey: conseilApiKey, network: "mainnet" },
    "mainnet",
    "big_map_contents",
    collectionQuery
  );
  let collection = collectionResult.map((i) => {
    return {
      piece: i.key.toString().replace(/.* ([0-9]{1,}$)/, "$1"),
      amount: Number(i.value),
    };
  });

  const queryChunks = chunkArray(
    collection.map((i) => i.piece),
    20
  ); // NOTE: consider increasing this number somewhat
  const makeObjectQuery = (keys) => {
    let mintedObjectsQuery = conseiljs.ConseilQueryBuilder.blankQuery();
    mintedObjectsQuery = conseiljs.ConseilQueryBuilder.addFields(
      mintedObjectsQuery,
      "key_hash",
      "value"
    );
    mintedObjectsQuery = conseiljs.ConseilQueryBuilder.addPredicate(
      mintedObjectsQuery,
      "big_map_id",
      conseiljs.ConseilOperator.EQ,
      [mainnet.nftMetadataMap]
    );
    mintedObjectsQuery = conseiljs.ConseilQueryBuilder.addPredicate(
      mintedObjectsQuery,
      "key",
      keys.length > 1
        ? conseiljs.ConseilOperator.IN
        : conseiljs.ConseilOperator.EQ,
      keys
    );
    mintedObjectsQuery = conseiljs.ConseilQueryBuilder.setLimit(
      mintedObjectsQuery,
      keys.length
    );

    return mintedObjectsQuery;
  };

  const objectQueries = queryChunks.map((c) => makeObjectQuery(c));
  const objectIpfsMap = {};
  await Promise.all(
    objectQueries.map(
      async (q) =>
        await conseiljs.TezosConseilClient.getTezosEntityData(
          { url: conseilServer, apiKey: conseilApiKey, network: "mainnet" },
          "mainnet",
          "big_map_contents",
          q
        ).then((result) =>
          result.map((row) => {
            const objectId = row["value"]
              .toString()
              .replace(/^Pair ([0-9]{1,}) .*/, "$1");
            const objectUrl = row["value"]
              .toString()
              .replace(/.* 0x([0-9a-z]{1,}) \}$/, "$1");
            const ipfsHash = Buffer.from(objectUrl, "hex").toString().slice(7);

            objectIpfsMap[objectId] = ipfsHash;
          })
        )
    )
  );

  collection = collection.map((i) => {
    return {
      ipfsHash: objectIpfsMap[i.piece.toString()],
      ...i,
    };
  });

  return collection.sort((a, b) => parseInt(b.piece) - parseInt(a.piece)); // sort descending by id – most-recently minted art first
};

/**
 * Queries Conseil in two steps to get all the objects minted by a specific address. Step 1 is to query for all 'mint_OBJKT' operations performed by the account to get the list of operation group hashes. Then that list is partitioned into chunks and another query (or set of queries) is run to get big_map values. These values are then parsed into an array of 3-tuples containing the hashed big_map key that can be used to query a Tezos node directly, the nft token id and the ipfs item hash.
 *
 * @param {string} address
 * @returns
 */
const getArtisticOutputForAddress = async (address) => {
  let mintOperationQuery = conseiljs.ConseilQueryBuilder.blankQuery();
  mintOperationQuery = conseiljs.ConseilQueryBuilder.addFields(
    mintOperationQuery,
    "operation_group_hash"
  );
  mintOperationQuery = conseiljs.ConseilQueryBuilder.addPredicate(
    mintOperationQuery,
    "kind",
    conseiljs.ConseilOperator.EQ,
    ["transaction"]
  );
  mintOperationQuery = conseiljs.ConseilQueryBuilder.addPredicate(
    mintOperationQuery,
    "timestamp",
    conseiljs.ConseilOperator.AFTER,
    [1612240919000]
  ); // 2021 Feb 1
  mintOperationQuery = conseiljs.ConseilQueryBuilder.addPredicate(
    mintOperationQuery,
    "status",
    conseiljs.ConseilOperator.EQ,
    ["applied"]
  );
  mintOperationQuery = conseiljs.ConseilQueryBuilder.addPredicate(
    mintOperationQuery,
    "destination",
    conseiljs.ConseilOperator.EQ,
    [mainnet.protocol]
  );
  mintOperationQuery = conseiljs.ConseilQueryBuilder.addPredicate(
    mintOperationQuery,
    "parameters_entrypoints",
    conseiljs.ConseilOperator.EQ,
    ["mint_OBJKT"]
  );
  mintOperationQuery = conseiljs.ConseilQueryBuilder.addPredicate(
    mintOperationQuery,
    "source",
    conseiljs.ConseilOperator.EQ,
    [address]
  );
  mintOperationQuery = conseiljs.ConseilQueryBuilder.addOrdering(
    mintOperationQuery,
    "block_level",
    conseiljs.ConseilSortDirection.DESC
  );
  mintOperationQuery = conseiljs.ConseilQueryBuilder.setLimit(
    mintOperationQuery,
    10_000
  ); // TODO: this is hardwired and will not work for highly productive artists

  const mintOperationResult = await conseiljs.TezosConseilClient.getTezosEntityData(
    { url: conseilServer, apiKey: conseilApiKey, network: "mainnet" },
    "mainnet",
    "operations",
    mintOperationQuery
  );

  const operationGroupIds = mintOperationResult.map(
    (r) => r["operation_group_hash"]
  );
  const queryChunks = chunkArray(operationGroupIds, 30);

  const makeObjectQuery = (opIds) => {
    let mintedObjectsQuery = conseiljs.ConseilQueryBuilder.blankQuery();
    mintedObjectsQuery = conseiljs.ConseilQueryBuilder.addFields(
      mintedObjectsQuery,
      "key_hash",
      "value"
    );
    mintedObjectsQuery = conseiljs.ConseilQueryBuilder.addPredicate(
      mintedObjectsQuery,
      "big_map_id",
      conseiljs.ConseilOperator.EQ,
      [mainnet.nftMetadataMap]
    );
    mintedObjectsQuery = conseiljs.ConseilQueryBuilder.addPredicate(
      mintedObjectsQuery,
      "operation_group_id",
      opIds.length > 1
        ? conseiljs.ConseilOperator.IN
        : conseiljs.ConseilOperator.EQ,
      opIds
    );
    mintedObjectsQuery = conseiljs.ConseilQueryBuilder.setLimit(
      mintedObjectsQuery,
      opIds.length
    );

    return mintedObjectsQuery;
  };

  const objectQueries = queryChunks.map((c) => makeObjectQuery(c));

  const objectInfo = await Promise.all(
    objectQueries.map(
      async (q) =>
        await conseiljs.TezosConseilClient.getTezosEntityData(
          { url: conseilServer, apiKey: conseilApiKey, network: "mainnet" },
          "mainnet",
          "big_map_contents",
          q
        ).then((result) =>
          result.map((row) => {
            const objectId = row["value"]
              .toString()
              .replace(/^Pair ([0-9]{1,}) .*/, "$1");
            const objectUrl = row["value"]
              .toString()
              .replace(/.* 0x([0-9a-z]{1,}) \}$/, "$1");
            const ipfsHash = Buffer.from(objectUrl, "hex").toString().slice(7);

            return { key: row["key_hash"], objectId, ipfsHash };
          })
        )
    )
  );

  return objectInfo
    .flat(1)
    .sort((a, b) => parseInt(b.objectId) - parseInt(a.objectId));
};

/**
 * Returns object ipfs hash and swaps if any
 *
 * @param {number} objectId
 * @returns
 */

const getObjectById = async (objectId) => {
  let objectQuery = conseiljs.ConseilQueryBuilder.blankQuery();
  objectQuery = conseiljs.ConseilQueryBuilder.addFields(objectQuery, "value");
  objectQuery = conseiljs.ConseilQueryBuilder.addPredicate(
    objectQuery,
    "big_map_id",
    conseiljs.ConseilOperator.EQ,
    [mainnet.nftMetadataMap]
  );
  objectQuery = conseiljs.ConseilQueryBuilder.addPredicate(
    objectQuery,
    "key",
    conseiljs.ConseilOperator.EQ,
    [objectId]
  );
  objectQuery = conseiljs.ConseilQueryBuilder.setLimit(objectQuery, 1);

  const objectResult = await conseiljs.TezosConseilClient.getTezosEntityData(
    { url: conseilServer, apiKey: conseilApiKey, network: "mainnet" },
    "mainnet",
    "big_map_contents",
    objectQuery
  );

  const objectUrl = objectResult[0]["value"]
    .toString()
    .replace(/.* 0x([0-9a-z]{1,}) \}$/, "$1");
  const ipfsHash = Buffer.from(objectUrl, "hex").toString().slice(7);

  let swapsQuery = conseiljs.ConseilQueryBuilder.blankQuery();
  swapsQuery = conseiljs.ConseilQueryBuilder.addFields(
    swapsQuery,
    "key",
    "value"
  );
  swapsQuery = conseiljs.ConseilQueryBuilder.addPredicate(
    swapsQuery,
    "big_map_id",
    conseiljs.ConseilOperator.EQ,
    [mainnet.nftSwapMap]
  );
  swapsQuery = conseiljs.ConseilQueryBuilder.addPredicate(
    swapsQuery,
    "value",
    conseiljs.ConseilOperator.LIKE,
    [`) (Pair ${objectId} `]
  );
  swapsQuery = conseiljs.ConseilQueryBuilder.setLimit(swapsQuery, 1000); // NOTE, limited to 1000 swaps for a given object

  const swapsResult = await conseiljs.TezosConseilClient.getTezosEntityData(
    { url: conseilServer, apiKey: conseilApiKey, network: "mainnet" },
    "mainnet",
    "big_map_contents",
    swapsQuery
  );
  const swapStoragePattern = new RegExp(
    `Pair [(]Pair 0x([0-9a-z]{44}) ([0-9]+)[)] [(]Pair ${objectId} ([0-9]+)[)]`
  );

  let swaps = [];
  try {
    swapsResult.map((row) => {
      const match = swapStoragePattern.exec(row["value"]);

      swaps.push({
        swap_id: row["key"],
        issuer: conseiljs.TezosMessageUtils.readAddress(match[1]),
        objkt_amount: match[2],
        xtz_per_objkt: match[3],
      });
    });
  } catch (error) {
    console.log(`failed to process swaps for ${objectId} with ${error}`);
  }

  return { objectId, ipfsHash, swaps };
};

const chunkArray = (arr, len) => {
  // TODO: move to util.js
  let chunks = [],
    i = 0,
    n = arr.length;

  while (i < n) {
    chunks.push(arr.slice(i, (i += len)));
  }

  return chunks;
};

module.exports = {
  getCollectionForAddress,
  getArtisticOutputForAddress,
  getObjectById,
};
