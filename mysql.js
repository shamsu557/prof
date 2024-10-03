const mysql = require('mysql');

// MySQL database connection configuration
const dbConfig = {
       host: process.env.DB_HOST || 'localhost',  // Use environment variable or default
    port: process.env.DB_PORT || 3306,                             // Default MySQL port or environment variable
    user: process.env.DB_USER || 'farnkama_data',                   // MySQL username from environment
    password: process.env.DB_PASSWORD || '@Shamsu1440',            // MySQL password from environment
    database: process.env.DB_NAME || 'frankama_mydatabase'    
};

// Create MySQL database connection
const db = mysql.createConnection(dbConfig);

// Connect to MySQL database
db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL database:', err.stack);
        return;
    }
    console.log('Connected to MySQL database as id', db.threadId);
});

// Export the database connection
module.exports = db;
