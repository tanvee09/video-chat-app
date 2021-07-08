require("dotenv").config();

const { Pool } = require("pg");

const connectionString = "postgres://kdnqtcid:uZzXni8Vvq5bHxeqW7nWISZC2EMVi0ss@john.db.elephantsql.com/kdnqtcid";

const pool = new Pool({
    connectionString: connectionString
});

module.exports = { pool };