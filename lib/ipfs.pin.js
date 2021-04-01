const util = require("util");
const exec = util.promisify(require("child_process").exec);

module.exports = async (hash, method = "add") => {
  // console.log(method, hash);
  // return;
  const { stdout, stderr } = await exec(`ipfs pin ${method} ${hash}`).catch(
    (e) => e
  );
  // not pinned is a valid state when rm is used
  if (stderr && !stderr.includes("not pinned"))
    console.error(`🚨 error with ${hash}`, stderr);
  if (stdout)
    console.log(method === "add" ? `✅` : `🗑️ `, stdout.replace("\n", ""));
};
