module.exports = {
  debug: () => process.env.DEBUG && console.log(...arguments),
  warn: () => console.log(...arguments),
  error: () => console.error(...arguments),
};
