var MongoClient = require('mongodb').MongoClient;
var responseApi = require('./response').responseApi;
var reservationApi = {};

reservationApi.get = function(userID, response) {
  MongoClient.connect("mongodb://localhost:27017/workhubDB", function(err, db) {
    if (!err) {
      var reservationsCollection = db.collection('reservations');
      reservationsCollection.find({'userID': userID}).toArray(function(err, records) {
        console.log(records);
        var meta = {}, answer = {};
        if (records) {
          meta.success = true;
          meta.error = '';
          answer.meta = meta;
          answer.data = records;
          console.log(answer);
          db.close();
          responseApi.sendResponse(answer, response);
        } else {
          meta.success = false;
          meta.error = 'Бронирования отсутствуют';
          answer.meta = meta;
          answer.data = {};
          db.close();
          responseApi.sendResponse(answer, response);
        }
      });
    }
  });
};

exports.reservation = reservationApi;
