/**
 * fetch all content (paginated) for a given API route on better-call.dev
 */
const fetchJSON = require("./fetch.json");
module.exports = async (url, key) => {
  console.log(url, key);
  const fetch = async (last_id) => {
    const delimiter = url.includes("?") ? "&" : "?";
    const response = await fetchJSON(
      last_id ? `${url}${delimiter}last_id=${last_id}` : url
    );
    console.log(response[key] && response[key].length, response.last_id);
    if (!response || !response[key] || !response[key].length) {
      return [];
    }
    if (response.last_id && response.last_id !== "0") {
      const sub = await fetch(response.last_id);
      return [...response[key], ...sub];
    }
    return response[key];
  };
  return fetch();
};
