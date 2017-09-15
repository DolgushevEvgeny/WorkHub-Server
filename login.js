var MongoClient = require('mongodb').MongoClient;
var responseApi = require('./response').responseApi;
var loginApi = {};

loginApi.login = function(userLogin, userPassword, response) {
  MongoClient.connect("mongodb://localhost:27017/workhubDB", function(err, db) {
    if (!err) {
      var usersCollection = db.collection('users');
      usersCollection.findOne({'login': userLogin, 'password': userPassword}, function(err, record) {
        if (!err) {
          var meta = {}, answer = {};
          if (record) {
            meta.success = true;
            meta.error = "";
            answer.meta = meta;
            answer.data = record;
            console.log(answer);
            db.close();
            responseApi.sendResponse(answer, response);
          } else {
            console.log('Записи нет');
            meta.success = false;
            meta.error = 'Неверный логин или пароль';
            answer.meta = meta;
            answer.data = {};
            console.log(answer);
            db.close();
            responseApi.sendResponse(answer, response);
          }
        }
      });
    }
  });
};

exports.login = loginApi;
