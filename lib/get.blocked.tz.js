const fetchJSON = require("./fetch.json");
module.exports = () =>
  fetchJSON(
    "https://raw.githubusercontent.com/hicetnunc2000/hicetnunc/main/filters/w.json"
  );
