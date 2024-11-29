const mysql = require('mysql');

// MySQL database connection configuration
const dbConfig = {
    host: process.env.DB_HOST || '192.250.234.159',  // Use environment variable or default
    port: process.env.DB_PORT || 3306,                       // Default MySQL port or environment variable
    user: process.env.DB_USER || 'frankama_admin',               // MySQL username from environment
    password: process.env.DB_PASSWORD || 'z-P*{@75p$Ou',       // MySQL password from environment
    database: process.env.DB_NAME || 'frankama_dbase'            // Database name from environment
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

// CREATE TABLE users (
//     id INT AUTO_INCREMENT PRIMARY KEY, -- Unique ID for each user
//     fullname VARCHAR(255) NOT NULL,    -- Full name of the user
//     email VARCHAR(255) NOT NULL UNIQUE, -- Email address (must be unique)
//     phone_number VARCHAR(15),         -- Phone number (optional)
//     password VARCHAR(255) NOT NULL,   -- Hashed password for security
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Record creation time
// );

// CREATE TABLE admins (
//     id INT AUTO_INCREMENT PRIMARY KEY, -- Unique ID for each admin
//     username VARCHAR(50) NOT NULL UNIQUE, -- Admin username (must be unique)
//     password VARCHAR(255) NOT NULL,   -- Hashed password for security
//     email VARCHAR(255) NOT NULL UNIQUE, -- Email address (must be unique)
//     fullName VARCHAR(255) NOT NULL,   -- Full name of the admin
//     phone VARCHAR(15),                -- Phone number (optional)
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Record creation time
// );

// CREATE TABLE books (
//     id INT AUTO_INCREMENT PRIMARY KEY, -- Unique identifier for each paper
//     bookTitle VARCHAR(255) NOT NULL, -- Title of the book
//     file_name VARCHAR(255) NOT NULL, -- File name of the uploaded book
//     date_added DATETIME NOT NULL, -- Date the  book was added
//     image VARCHAR(255) NOT NULL -- File name of the book's image
// );
// CREATE TABLE papers (
//     id INT AUTO_INCREMENT PRIMARY KEY, -- Unique identifier for each paper
//     paperTitle VARCHAR(255) NOT NULL, -- Title of the paper
//     file_name VARCHAR(255) NOT NULL, -- File name of the uploaded paper
//     date_added DATETIME NOT NULL, -- Date the paper was added
//     image VARCHAR(255) NOT NULL -- File name of the paper's image
// );


// CREATE TABLE sessions (
//     id INT AUTO_INCREMENT PRIMARY KEY,         -- Unique identifier for each session
//     user_id INT NOT NULL,                      -- ID of the user associated with the session
//     session_token VARCHAR(255) NOT NULL,       -- Unique session token
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Timestamp when the session was created
//     expires_at TIMESTAMP,                      -- Timestamp when the session expires
//     FOREIGN KEY (user_id) REFERENCES users(id) -- Foreign key linking to the users table
// );
