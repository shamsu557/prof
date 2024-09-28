const mysql = require('mysql');


// MySQL database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '@Shamsu1440',
    database: 'professor_website'
  });  

// Connect to MySQL database
db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL database:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

module.exports = db;