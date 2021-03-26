module.exports = (objkt) => {
  return objkt.filter((o) => {
    if (Object.keys(o).length === 0) {
      // if empty object ignore
      return true;
    } else if (!o.token_info) {
      // if missing token_info flag as corrupt
      console.warn("objkt flagged as corrupt", objkt);
      return false;
    }
    return true;
  });
};
