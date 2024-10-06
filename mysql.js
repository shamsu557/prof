const mysql = require('mysql');

// MySQL database connection configuration
const dbConfig = {
    host: process.env.DB_HOST || 'sql5.freesqldatabase.com',  // Use environment variable or default
    port: process.env.DB_PORT || 3306,                       // Default MySQL port or environment variable
    user: process.env.DB_USER || 'sql5735499',               // MySQL username from environment
    password: process.env.DB_PASSWORD || 'n12u97u6Ce',       // MySQL password from environment
    database: process.env.DB_NAME || 'sql5735499'            // Database name from environment
};

// Create MySQL connection
const db = mysql.createConnection(dbConfig);

// Connect to MySQL database
db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL database:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Export the database connection
module.exports = db;
