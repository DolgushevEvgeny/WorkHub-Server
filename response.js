
var responseApi = {};

responseApi.sendResponse = function(answer, response) {
  response = setResponseHeaders(response);
  response.setHeader('Content-Type', 'application/json');
  response.json(answer);
};

function setResponseHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "X-Requested-With");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

exports.responseApi = responseApi;
