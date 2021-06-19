const LocalStrategy = require('passport-local').Strategy;
const { pool } = require('./dbConfig');
const bcrypt = require('bcrypt');

const initialize = (passport) => {
  const authenticateUser = (email, password, done) => {
    pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email],
      (err, result) => {
        if (err) {
          throw err;
        }

        if (result.rows.length > 0) {
          const user = result.rows[0];
          bcrypt.compare(password, user.hashed_password, (err, isMatch) => {
            if (err) {
              throw err;
            }
            if (isMatch) {
              return done(null, user);
            } else {
              return done(null, false, {
                message: "Incorrect password"
              });
            }
          })
        } else {
          return done(null, false, {
            message: "Incorrect email address"
          });
        }
      }
    )
  };

  passport.use(
    'users',
    new LocalStrategy(
      { usernameField: "email", passwordField: "password"},
      authenticateUser
    )
  );

  passport.serializeUser((user, done) => done(
    null, { id: user.id, email: user.email, name: user.name }
  ));

  passport.deserializeUser((obj, done) => {
    pool.query(
      `SELECT * FROM users WHERE id = $1`, 
      [obj.id],
      (err, result) => {
        if (err) {
          return done(err);
        } else {
          return done(null, result.rows[0]);
        }
      }
    )
  });
};

module.exports = initialize;