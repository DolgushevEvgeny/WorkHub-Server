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
            if (records) {
              console.log('Кол-во офисов: ' + records.length);
              if (records.length) {
                answer.records = records;
                answer.code = 1;
                db.close();
                sendResponse(answer, response);
              } else {
                answer.code = 2;
                answer.message = 'В данном городе пока еще нет офисов.';
                db.close();
                sendResponse(answer, response);
              }
            } else {
              answer.code = 2;
              answer.message = 'В данном городе пока еще нет офисов.';
              db.close();
              sendResponse(answer, response);
            }
          });
        } else {
          answer.code = 0;
          answer.message = 'Такого пользователя не существует.';
          db.close();
          sendResponse(answer, response);
        }
      });
    }
  });
};

exports.office = officeApi;
