module.exports = new Proxy(
  {},
  {
    get: function (t, n) {
      if (n === '__esModule') return true;
      return function () {
        return null;
      };
    },
  },
);
