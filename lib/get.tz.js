/**
 * fetch collected tz info from hicetnunc API
 * NOTE: someday this might stop working
 */
const fetchJSON = require("./fetch.json");
module.exports = async (tz) => {
  const response = await fetchJSON(
    `https://51rknuvw76.execute-api.us-east-1.amazonaws.com/dev/tz`,
    {
      body: {
        tz,
      },
      method: "POST",
    }
  );
  return response.result;
};
