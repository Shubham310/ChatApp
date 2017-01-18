var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var exphbs = require('express-handlebars');
var expressValidator = require('express-validator');
var flash = require('connect-flash');
var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongo = require('mongodb');
var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/chatApp');
var db = mongoose.connection;

var app = express();
var users = require('./routes/users');
var routes = require('./routes/index');

//view engine
app.set('views', path.join(__dirname, 'views'));
app.engine('handlebars', exphbs({defaultLayout: 'layout'}));
app.set('view engine', 'handlebars');

// BodyParser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Set Static Folder
app.use(express.static(path.join(__dirname, 'public')));

// Express Session
app.use(session({
    secret: 'secret',
    saveUninitialized: true,
    resave: true
}));

// Passport init
app.use(passport.initialize());
app.use(passport.session());

// Express Validator
app.use(expressValidator({
  errorFormatter: function(param, msg, value) {
      var namespace = param.split('.')
      , root    = namespace.shift()
      , formParam = root;

    while(namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param : formParam,
      msg   : msg,
      value : value
    };
  }
}));

// Connect Flash
app.use(flash());

// Global Vars
app.use(function (req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  //request user from anywhere
  res.locals.user = req.user || null;
  next();
});



app.use('/', routes);
app.use('/users', users);

// socketio
var http = require('http').Server(app);
var io = require('socket.io')(http);

var numUsers = 0;
var list = [];
io.on('connection', function(socket){
  var addedUser = false;
  
  function disconnect(){
    console.log('client disconnected');
    if(addedUser){
      --numUsers;
    var index = list.indexOf(socket.username);
    list.splice(index, 1);
      // echo globally that this user has left
      socket.broadcast.emit('user left',{
        username: socket.username,
        numUsers: numUsers,
        list: list
      });
    }
  }
  console.log('user connected');
  if(addedUser) return;
  //client emit 'add user'

  socket.on('add user', function(username){
    socket.username = username;
    list.push(username);
    ++numUsers;
    addedUser=true;
    console.log(socket.username + ' is ' + numUsers);
    io.emit('user Joined', {
      username : socket.username,
      numUsers : numUsers,
      list : list
    });
  });


  socket.on('disconnect', disconnect);
//sending message
  socket.on('chat message', function(msg){
    socket.broadcast.emit('chat message', msg);

  });
//who is typing
  socket.on('sender', function(data){
    socket.broadcast.emit('sender', data);
  });
});

http.listen(3000, function(){
  console.log('connected to port 3000');
})
