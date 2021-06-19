const express = require('express');
const {v4: uuid} = require('uuid');
require("dotenv").config();
const app = express();
const server = require('http').Server(app);
const bcrypt = require('bcrypt');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const { pool } = require("./dbConfig");

const io = require('socket.io')(server);
const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, {
  debug: true
});

const initializePassport = require('./passportConfig');
initializePassport(passport);

app.use(express.static('public'));
app.use('/peerjs', peerServer);
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(
  session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.get('/', (req, res) => {
  res.render('start_page', { isAuthenticated: req.isAuthenticated() });
});

app.post('/joinRoom', (req, res) => {
  res.redirect(`/room/${req.body.roomIdInput}`);
});

app.post('/createRoom', (req, res) => {
  res.redirect(`/room/${uuid()}`)
});

app.get('/room/:roomId', (req, res) => {
  if (req.user)
    res.render('room', { roomId: req.params.roomId, name: req.user.name });
  else
    res.render('room', { roomId: req.params.roomId, name: "Guest" })
});

// -------- PROFILE --------------------------------

app.get('/profile', checkNotAuthenticated, async (req, res) => {
  res.render('profile', {
    name: req.user.name,
    email: req.user.email,
  });
});

app.post('/profile', async (req, res) => {
  let { name, email, new_password, password } = req.body;
  let errors = [];
  if (new_password == password) {
    errors.push({ message: "New password cannot be same as old password" });
  }
  if (new_password.length < 6 && new_password.length > 0) {
    errors.push({ message: "Password must be atleast 6 characters" });
  }
  let hashedPassword = await bcrypt.hash(new_password, 10);

  let sameEmail = (email == req.user.email);

  if (errors.length > 0) {
    res.render('profile', { errors, name, email });
  } else {
    pool.query(
      `SELECT * FROM users
      WHERE email = $1`,
      [email],
      (err, result) => {
        if (err) {
          throw err;
        }
        if (result.rows && result.rows.length > 0 && !sameEmail) {
          errors.push({ message: "Email already registered" });
          return res.render('profile', { errors, name, email: req.user.email });
        } else {
          pool.query(
            `SELECT * FROM users
            WHERE email = $1`,
            [req.user.email],
            (err, result) => {
              bcrypt.compare(password, result.rows[0].hashed_password, (err, isMatch) => {
                if (err) {
                  throw err;
                }
                if (!isMatch) {
                  errors.push({ message: "Incorrect old password" });
                  return res.render('profile', { errors, name, email });
                }
              });
              if (new_password.length > 0) {
                pool.query(
                  `UPDATE users
                  SET name = $1,
                  email = $2,
                  hashed_password = $3
                  WHERE email = $4`,
                  [name, email, hashedPassword, req.user.email],
                  (err, result) => {
                    if (err) {
                      throw err;
                    }
                    req.flash("success_msg", "Profile details changed");
                    res.redirect('/profile');
                  }
                );
              } else {
                pool.query(
                  `UPDATE users
                  SET name = $1,
                  email = $2
                  WHERE email = $3`,
                  [name, email, req.user.email],
                  (err, result) => {
                    if (err) {
                      throw err;
                    }
                    req.flash("success_msg", "Profile details changed");
                    res.redirect('/profile');
                  }
                );
              }
            }
          );
        }
      }
    );
  }
});


// -------- USER LOGIN, LOGOUT & REGISTER -----------

app.get('/login', checkAuthenticated, (req, res) => {
  res.render('login');
});

app.post('/login', passport.authenticate('users', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}));


app.get('/logout', (req, res) => {
  req.logOut();
  res.redirect('/');
});


app.get('/register', checkAuthenticated, (req, res) => {
  res.render('register');
});

app.post('/register', async (req, res) => {
  let { name, email, password, password2 } = req.body;
  console.log(email);
  let errors = [];
  if (!name || !email || !password || !password2) {
    errors.push({ message: "Please fill all the fields" });
  }
  if (password.length < 6) {
    errors.push({ message: "Password must be at least 6 characters long" });
  }
  if (password !== password2) {
    errors.push({ message: "Passwords do not match" });
  }

  if (errors.length > 0) {
    res.render('register', { errors, name, email });
  } else {
    hashedPassword = await bcrypt.hash(password, 10);
    pool.query(
      `SELECT * FROM users
      WHERE email = $1`,
      [email],
      (err, result) => {
        if (err) {
          throw err;
        }
        if (result.rows && result.rows.length > 0) {
          errors.push({ message: "Email already registered" });
          return res.render('register', { errors, name, email });
        } else {
          pool.query(
            `INSERT INTO users (name, email, hashed_password)
            VALUES ($1, $2, $3)
            RETURNING id`,
            [name, email, hashedPassword],
            (err, id) => {
              if (err) {
                throw err;
              }
              req.flash("success_msg", "You are now registered. Please log in.");
              res.redirect('/login');
            }
          );
        }
      }
    );
  }
});

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
      return res.redirect('/profile');
  }
  next();
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
      return next();
  }
  res.redirect('/login');
}


// --------- VIDEO & CHAT -------------------------


io.on('connection', socket => {
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', userId);

    socket.on('message', data => {
      io.to(roomId).emit('create-message', { message: data.message, username: data.username, userId: data.userId });
    });
  })
});


server.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});