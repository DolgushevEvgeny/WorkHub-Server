
var utils = {};

utils.hasText = function(string) {
  if (string.length) {
    return true;
  } else {
    return false;
  }
};

exports.utils = utils;
