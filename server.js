var formidable = require("formidable");
var fs = require("fs");
var url = require("url");
var http = require("http");
var express = require('express');
var ObjectId = require('mongodb').ObjectID;
var MongoClient = require('mongodb').MongoClient;
var nodeMailer = require("nodemailer");
var utils = require("./utils").utils;
var loginApi = require("./login").login;
var reservationApi = require("./reservation").reservation;
var officeApi = require("./office").office;
var citiesApi = require("./cities").cities;

var app = express();

app.listen(3000, function(err) {
  console.log("Server has started.");
});

app.get('/login', function(request, response) {
  console.log("Request get /login received.");

  var userLogin = request.query.login;
  var userPassword = request.query.password;
  loginApi.login(userLogin, userPassword, response);
});

app.get('/MyReservations', function(request, response) {
  console.log("Request get /canMakeReservation received.");

  var userID = request.query.userID;
  reservationApi.get(userID, response);
});

app.get('/getOffices', function(request, response) {
  console.log("Request get /getOffices received.");

  var city = request.query.city;
  var userID = request.query.userID;
  console.log(city);
  console.log(userID);

  officeApi.get(userID, city, response);
});

app.get('/getPlans', function(request, response) {
  console.log("Request get /getPlans received.");

  var cityName = request.query.city;
  var officeName = request.query.office;
  var userID = request.query.userID;
  console.log(cityName);
  console.log(officeName);
  console.log(userID);

  var answer = {};
  MongoClient.connect("mongodb://localhost:27017/workhubDB", function(err, db) {
    if (!err) {
      var usersCollection = db.collection('users');
      usersCollection.findOne({'_id': ObjectId(userID)}, function(err, record) {
        if (record) {
          var plansCollection = db.collection('plans');
          plansCollection.find({'city': cityName, 'office': officeName}).toArray(function(err, records) {
            if (records) {
              console.log('Кол-во планов: ' + records.length);
              if (records.length) {
                answer.records = records;
                answer.code = 1;
                db.close();
                sendResponse(answer, response);
              } else {
                answer.code = 2;
                answer.message = 'В данном офисе пока еще нет планов.';
                db.close();
                sendResponse(answer, response);
              }
            } else {
              answer.code = 2;
              answer.message = 'В данном офисе пока еще нет планов.';
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
});

app.get('/getDayWorkTime', function(request, response) {
  console.log("Request get /getDayWorkTime received.");

  var day = request.query.day;
  var officeName = request.query.office;
  var cityName = request.query.city;
  console.log(day);
  console.log(officeName);
  console.log(cityName);

  var answer = {};
  MongoClient.connect("mongodb://localhost:27017/workhubDB", function(err, db) {
    if (!err) {
      var officesCollection = db.collection('offices');
      officesCollection.findOne({'city': cityName, 'name': officeName}, function(err, record) {
        if (!err) {
          if (record) {
            var workList = record.workList;
            var resultDay = workList[day];
            answer.work_day = resultDay;
            answer.code = 1;
            db.close();
            sendResponse(answer, response);
          }
        } else {
          //Todo обработать ошибку
        }
      });
    }
  });
});

app.get('/removeReservation', function(request, response) {
  console.log("Request get /canMakeReservation received.");

  var officeName = request.query.office,
      cityName = request.query.city,
      planName = request.query.plan,
      date = request.query.date,
      startTime = +request.query.startTime,
      duration = +request.query.duration,
      userID = request.query.userID;

  var answer = {};
  MongoClient.connect("mongodb://localhost:27017/workhubDB", function(err, db) {
    if (!err) {
      var reservationsCollection = db.collection('reservations');
      reservationsCollection.remove({'city': cityName, 'office': officeName,'plan': planName,
        'date': date, 'startTime': startTime, 'duration': duration, 'userID': userID}, 1);
    }
    db.close();
    sendResponse(answer, response);
  });
});

app.get('/canTakePlace', function(request, response) {
  console.log("Request get /canTakePlace received.");
  var reservation = JSON.parse(request.query.reservation);
  var listTimes = fillTimeList(reservation.startTime, reservation.duration), answer = {};

  MongoClient.connect("mongodb://localhost:27017/workhubDB", function(err, db) {
    if (!err) {
      var reservationsCollection = db.collection('reservations');
      reservationsCollection.find({'userID': reservation.userID}).toArray(function(err, records) {
        if (records) {
          var result = checkOnCollision(reservation.userID, reservation, records);
          if (result.canReserve) {
            var plansCollection = db.collection('plans');
            var city = reservation.city, office = reservation.office, plan = reservation.plan;
            plansCollection.findOne({'city': city, 'office': office, 'name': plan}, function(err, record) {
              if (!err) {
                var planCapacity = +record.capacity;
                console.log('кол-во мест: ' + planCapacity);
                var reservationsCollection = db.collection('reservations');
                reservationsCollection.find({'city': reservation.city, 'office': reservation.office,
                  'plan': reservation.plan, 'date': reservation.date}).toArray(function(err, records) {
                    if (records) {
                      if (records.length) {
                        console.log('всего бронирований на день: ' + records.length);
                        var list = fillPlaceTimeArray(records),
                            result = canReserveTime(listTimes, list, planCapacity),
                            canReserve = result.canReserve, nonReserveTime = result.nonReserveTime;
                        if (canReserve) {
                          answer.code = 1;
                        } else {
                          answer.code = 0;
                          answer.date = reservation.date;
                          answer.nonReserveTimes = nonReserveTime;
                        }

                        db.close();
                        sendResponse(answer, response);
                      } else {
                        answer.code = 1;
                        db.close();
                        sendResponse(answer, response);
                      }
                    } else {
                      answer.code = 2;
                      db.close();
                      sendResponse(answer, response);
                    }
                });
              }
            });
          } else {
            answer.code = 3;
            answer.message = 'У вас уже есть в это время бронирование';
            answer.date = result.date;
            answer.startTime = result.startTime;
            answer.duration = result.duration;
            db.close();
            sendResponse(answer, response);
          }
        }
      });
    }
  });
});

app.get('/setReservation', function(request, response) {
  console.log("Request get /canTakePlace received.");
  var reservation = JSON.parse(request.query.reservation);
  var answer = {};
  MongoClient.connect("mongodb://localhost:27017/workhubDB", function(err, db) {
    if (!err) {
      var reservationsCollection = db.collection('reservations');
      setReservation(reservationsCollection, reservation.city, reservation.office,
        reservation.plan, reservation.date, reservation.startTime, reservation.duration,
        reservation.planPrice, reservation.officeAddress, reservation.status, reservation.userID);
      sendEmail(reservation);
    }
    db.close();
    sendResponse(answer, response);
  });
});

app.get('/changePassword', function(request, response) {
  console.log("Request get /changePassword received.");

  var userID = request.query.userID;
  var newPassword = request.query.password;
  console.log(userID);
  console.log(newPassword);

  var answer = {};
  MongoClient.connect("mongodb://localhost:27017/workhubDB", function(err, db) {
    if (!err) {
      var usersCollection = db.collection('users');
      usersCollection.findOne({'_id': ObjectId(userID)}, function(err, record) {
        if (record) {
          console.log(record);
          usersCollection.update({'_id': ObjectId(userID)}, {$set: {'password': newPassword}});
          answer.code = 1;
          answer.message = 'Пароль обновлен.'
          db.close();
          sendResponse(answer, response);
        } else {
          answer.code = 0;
          answer.message = 'Такого пользователя не существует.';
          db.close();
          sendResponse(answer, response);
        }
      });
    }
  });
});

app.get('/getCities', function(request, response) {
  console.log("Request get /getCities received.");

  var cities = ["Йошкар-Ола", "Казань", "Самара", "Нижний-Новгород"];
  var answer = {};
  answer.cities = cities;
  sendResponse(answer, response);
});

function fillPlaceTimeArray(records) {
  var list = [];
  for (var i = 0; i < records.length; ++i) {
    var itemStartTime = +records[i].startTime, itemDuration = +records[i].duration;

    for (var j = itemStartTime; j < itemStartTime + itemDuration; ++j) {
      var listItem = getListItem(list, j);
      listItem.hour = j;
      listItem.count += 1;
      list = setListItem(list, listItem, j);
    }
  }
  return list;
}

function canReserveTime(listTimes, list, planCapacity) {
  var canReserve = true, nonReserveTime = [];
  for (var i = 0; i < listTimes.length; ++i) {
    var listItem = getListItem(list, listTimes[i]);
    if (listItem.count < planCapacity) {
      listItem.count += 1;
      setListItem(list, listItem, listTimes[i]);
    } else {
      canReserve = false;
      nonReserveTime.push(listTimes[i]);
    }
  }

  return {'canReserve': canReserve, 'nonReserveTime': nonReserveTime};
}

function checkOnCollision(userID, reservation, records) {
  var firstDate = reservation.date.split('.');
  var answer = {};
  for (var i = 0; i < records.length; ++i) {
    var myReservation = records[i];
    var secondDate = myReservation.date.split('.');
    if (firstDate[2] == secondDate[2] && firstDate[1] == secondDate[1] && firstDate[0] == secondDate[0]) {
      if (checkCondition(reservation.startTime, reservation.duration, myReservation.startTime) ||
          checkCondition(myReservation.startTime, myReservation.duration, reservation.startTime)) {
            console.log("У вас уже есть бронирование в это время");
            answer.canReserve = false;
            answer.date = myReservation.date;
            answer.startTime = myReservation.startTime;
            answer.duration = myReservation.duration;
            return answer;
      }
    }
  }
  answer.canReserve = true;
  console.log("Можно занимать");
  return answer;
}

function checkCondition(firstStartTime, firstDuration, secondStartTime) {
  if (secondStartTime >= firstStartTime &&
    secondStartTime < (firstStartTime + firstDuration)) {
      return true;
  }
  return false;
}

function sendEmail(reservation) {
  var transporter = nodeMailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'baraxlush1995@gmail.com',
      pass: 'warmachine1995'
    }
  });

  var mailOptions = {
    from: '"WorkHub" <baraxlush1995@gmail.com>',
    to: 'eugene.dolgushev@gmail.com',
    subject: 'Информация о платеже',
    html: createMailContent(reservation)
  };

  transporter.sendMail(mailOptions, function(error, info) {
    if (error) {
        return console.log(error);
    }
    console.log('Message %s sent: %s', info.messageId, info.response);
  });
}

function createMailContent(reservation) {
  var text = '';
  var time = new Date();
  var timeText = time.getDate() + '.' + (time.getMonth() + 1) + '.' + time.getFullYear() +
    '  ' + time.getHours() + ':' + time.getMinutes();

  text += '<p><b>Платеж успешно выполнен</b></p>' +
    '<p><b>WorkHub</b></p>' + '<p>Дата и время: ' + timeText + '</p>' +
    '<p>Сумма: ' + (reservation.duration * reservation.planPrice) + ' руб.</p>' +
    '<p>Ваш план: ' + reservation.plan + '</p>' +
    '<p>Тариф: ' + reservation.planPrice + '</p>' +
    '<p>Дата и время посещения: ' + reservation.date + ' c ' + reservation.startTime +
    ' до ' + (reservation.startTime + reservation.duration) +'</p>';

  return text;
}

function getListItem(list, hour) {
  for (var i = 0; i < list.length; ++i) {
    if (list[i].hour == hour) {
      return list[i];
    }
  }
  return {'hour': 0, 'count': 0};
}

function setListItem(list, item, hour) {
  for (var i = 0; i < list.length; ++i) {
    if (list[i].hour == hour) {
      list[i] = item;
      return list;
    }
  }
  list.push(item);
  return list;
}

function removeReserve(list, hour) {
  for (var i = 0; i < list.length; ++i) {
    if (list[i].hour == hour) {
      list[i].count -= 1;
      return;
    }
  }
}

function setReservation(collection, cityName, officeName, planName, date, startTime, duration, planPrice, officeAddress, status, userID) {
  var record = setReservationFields(cityName, officeName, planName, date, startTime, duration, planPrice, officeAddress, status, userID);
  collection.insertOne(record);
}

function setReservationFields(cityName, officeName, planName, date, startTime, duration, planPrice, officeAddress, status, userID) {
  var reservation = {};
  reservation.city = cityName;
  reservation.office = officeName;
  reservation.plan = planName;
  reservation.date = date;
  reservation.startTime = startTime;
  reservation.duration = duration;
  reservation.planPrice = planPrice;
  reservation.userID = userID;
  reservation.officeAddress = officeAddress;
  reservation.status = status;
  return reservation;
}

function fillTimeList(startTime, duration) {
  var timeList = [];
  for (var i = startTime; i < startTime + duration; ++i) {
    timeList.push(i);
  }
  return timeList;
}

function sendResponse(answer, response) {
  response = setResponseHeaders(response);
  response.setHeader('Content-Type', 'application/json');
  response.json(answer);
}

function setResponseHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "X-Requested-With");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  return response;
}
