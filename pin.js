/**
 * This is a conseil using method of pinning
 * Rather than hitting the hicetnunc API
 * This method requires the process.env.CONSEIL_KEY environmental variable
 * AND requires node module dependencies
 *
 * if you are running an IPFS node,
 * you can pin the collection/creations of any tz address like so
 *
 * node pin.js tz1iyFi4WjSttoja7Vi1EJYMEKKSebQyMkF9
 */

const filterUnique = require("./lib/filter.unique");
const getBlockedObj = require("./lib/get.blocked.obj");
const getBlockedTz = require("./lib/get.blocked.tz");
const getTZ = require("./lib/get.tz");
const objktSanitize = require("./lib/objkt.sanitize");
const pin = require("./lib/ipfs.pin");

const tz = process.argv[2];

console.log(`⚡ fetching content for address ${tz}`);

(async () => {
  const [oblock, wblock] = await Promise.all([getBlockedObj(), getBlockedTz()]);
  const objkts = await getTZ(tz);

  const sanitizedList = objktSanitize(objkts).filter(filterUnique);

  const filtered = sanitizedList.filter(
    (i) =>
      !oblock.includes(i.token_id) && !wblock.includes(i.token_info.creators[0])
  );

  const contentHashes = filtered
    .map((i) => i.token_info.artifactUri.replace("ipfs://", ""))
    .filter(filterUnique);
  const thumbnailHashes = filtered
    .map((i) => i.token_info.thumbnailUri.replace("ipfs://", ""))
    .filter(filterUnique);
  console.log(`⚡ pinning ${filtered.length} meta hashes`);
  for (let i = 0; i < filtered.length; i++) {
    await pin(filtered[i].ipfsHash);
  }
  console.log(`⚡ pinning ${contentHashes.length} content hashes`);
  for (let i = 0; i < contentHashes.length; i++) {
    await pin(contentHashes[i]);
  }
  console.log(`⚡ pinning ${thumbnailHashes.length} thumb hashes`);
  for (let i = 0; i < thumbnailHashes.length; i++) {
    await pin(thumbnailHashes[i]);
  }

  const blocked = sanitizedList
    .filter(
      (i) =>
        oblock.includes(i.token_id) || wblock.includes(i.token_info.creators[0])
    )
    .filter(filterUnique);
  const blockedContentHashes = blocked
    .map((i) => i.token_info.artifactUri.replace("ipfs://", ""))
    .filter(filterUnique);
  const blockedThumbnailHashes = blocked
    .map((i) => i.token_info.thumbnailUri.replace("ipfs://", ""))
    .filter(filterUnique);

  console.log(`⚡ unpinning ${blocked.length} meta hashes`);
  for (let i = 0; i < blocked.length; i++) {
    await pin(blocked[i].ipfsHash, "rm");
  }
  console.log(`⚡ unpinning ${blockedContentHashes.length} content hashes`);
  for (let i = 0; i < blockedContentHashes.length; i++) {
    await pin(blockedContentHashes[i], "rm");
  }
  console.log(`⚡ unpinning ${blockedThumbnailHashes.length} thumb hashes`);
  for (let i = 0; i < blockedThumbnailHashes.length; i++) {
    await pin(blockedThumbnailHashes[i], "rm");
  }
})();
