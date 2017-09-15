var MongoClient = require('mongodb').MongoClient;
var responseApi = require('./response').responseApi;
var officeApi = {};

officeApi.get = function(userID, city, response) {
  var answer = {};
  MongoClient.connect("mongodb://localhost:27017/workhubDB", function(err, db) {
    if (!err) {
      var usersCollection = db.collection('users');
      usersCollection.findOne({'_id': ObjectId(userID)}, function(err, record) {
        if (record) {
          var officesCollection = db.collection('offices');
          officesCollection.find({'city': city}).toArray(function(err, records) {
            var meta = {}, answer = {};
            if (records) {
              console.log('Кол-во офисов: ' + records.length);
              meta.success = true;
              meta.error = '';
              answer.meta = meta;
              answer.data = records;
              console.log(answer);
              db.close();
              responseApi.sendResponse(answer, response);
            } else {
              meta.success = false;
              meta.error = 'В данном городе пока еще нет офисов';
              answer.meta = meta;
              answer.data = {};
              db.close();
              responseApi.sendResponse(answer, response);
            }
          });
        }
      });
    }
  });
};

exports.office = officeApi;
