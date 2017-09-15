var MongoClient = require('mongodb').MongoClient;
var responseApi = require('./response').responseApi;
var citiesApi = {};

citiesApi.get = function() {
  var records = ["Йошкар-Ола", "Казань", "Самара", "Нижний-Новгород"];
  var meta = {}, answer = {};
  meta.success = true;
  meta.error = '';
  answer.meta = meta;
  answer.data = records;
  console.log(answer);
  responseApi.sendResponse(answer, response);
};

exports.cities = citiesApi;
