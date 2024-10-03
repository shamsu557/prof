const mysql = require('mysql');

// MySQL database connection configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306, // Ensure the port is an integer
    user: process.env.DB_USER || 'shamsu557',
    password: process.env.DB_PASSWORD || '@Shamsu1440',
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
