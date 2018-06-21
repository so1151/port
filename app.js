const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const dataBase = require('./lib/index.js')
const session = require('express-session')
const multer = require('multer')
const upload = multer()
// const bodyParse = require('body-parser')
const apiRouter = require('./routes/api')
const indexRouter = require('./routes/index');

const app = express();

//上传任意文件
app.use(upload.any())

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(dataBase('lemon'))
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// app.use(bodyParse())
app.use(session({
  secret:'lemon',
  saveUninitialized:false,
  resave:false
}))

app.use('/api',apiRouter)
app.use('/', indexRouter);
app.use(express.static(path.join(__dirname, 'public')));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
