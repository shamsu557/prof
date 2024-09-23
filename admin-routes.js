const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const router = express.Router();
const db = require('./mysql'); // Your MySQL configuration file
const bcrypt = require('bcryptjs');

// Serve static files (HTML, CSS, JS)
router.use(express.static(path.join(__dirname))); // Serving static files

// Set up storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname); // Ensure this folder exists
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Append timestamp to filename
    }
});

const upload = multer({ storage: storage });

// API to fetch user and resource counts for the admin dashboard
router.get('/stats', (req, res) => {
    const sqlUsersCount = 'SELECT COUNT(*) AS count FROM users';
    const sqlBooksCount = 'SELECT COUNT(*) AS count FROM books';
    const sqlPapersCount = 'SELECT COUNT(*) AS count FROM papers';

    db.query(sqlUsersCount, (err, userResult) => {
        if (err) throw err;

        db.query(sqlBooksCount, (err, booksResult) => {
            if (err) throw err;

            db.query(sqlPapersCount, (err, papersResult) => {
                if (err) throw err;

                res.json({
                    usersCount: userResult[0].count,
                    booksCount: booksResult[0].count,
                    papersCount: papersResult[0].count,
                });
            });
        });
    });
});

// Middleware to check if admin is authenticated
router.get('/is-logged-in', (req, res) => {
    if (req.session.isAdmin) {
        res.json({ isLoggedIn: true });
    } else {
        res.json({ isLoggedIn: false });
    }
});

// Route to get all books
router.get('/getBooks', (req, res) => {
    const sql = 'SELECT * FROM books';
    db.query(sql, (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

// Route to get all papers
router.get('/getPapers', (req, res) => {
    const sql = 'SELECT * FROM papers';
    db.query(sql, (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

// Route to add a book
router.post('/addBook', upload.fields([{ name: 'bookFile' }, { name: 'bookImage' }]), (req, res) => {
    const { bookTitle } = req.body;
    const fileName = req.files['bookFile'][0].filename;
    const imageName = req.files['bookImage'][0].filename;
    const dateAdded = new Date();

    const sql = 'INSERT INTO books (bookTitle, file_name, date_added, image) VALUES (?, ?, ?, ?)';
    db.query(sql, [bookTitle, fileName, dateAdded, imageName], (err) => {
        if (err) throw err;
        res.status(201).json({ message: 'Book added successfully!' });
    });
});

// Route to add a paper
router.post('/addPaper', upload.fields([{ name: 'paperFile' }, { name: 'paperImage' }]), (req, res) => {
    const { paperTitle } = req.body;
    const fileName = req.files['paperFile'][0].filename;
    const imageName = req.files['paperImage'][0].filename;
    const dateAdded = new Date();

    const sql = 'INSERT INTO papers (paperTitle, file_name, date_added, image) VALUES (?, ?, ?, ?)';
    db.query(sql, [paperTitle, fileName, dateAdded, imageName], (err) => {
        if (err) throw err;
        res.status(201).json({ message: 'Paper added successfully!' });
    });
});

// Route to get all users
router.get('/getUsers', (req, res) => {
    const sql = 'SELECT id, fullname, username, email, phone_number, created_at FROM users';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching users:', err);
            return res.status(500).json({ message: 'Error fetching users' });
        }
        res.json(results);
    });
});

// Route to remove a user
router.delete('/removeUser/:id', async (req, res) => {
    const userId = req.params.id;
    const { username, password } = req.body; // Expecting username and password in the request body

    // Check if admin exists and verify password
    const sqlCheckAdmin = 'SELECT * FROM admins WHERE username = ?';

    db.query(sqlCheckAdmin, [username], async (err, adminResult) => {
        if (err || adminResult.length === 0) {
            return res.status(403).json({ message: 'Invalid admin credentials' });
        }

        const admin = adminResult[0];

        // Compare the provided password with the hashed password in the database
        const match = await bcrypt.compare(password, admin.password);
        if (!match) {
            return res.status(403).json({ message: 'Invalid admin credentials' });
        }

        // If admin is valid, proceed to delete the user
        const sqlDeleteUser = 'DELETE FROM users WHERE id = ?';
        db.query(sqlDeleteUser, [userId], (err) => {
            if (err) {
                console.error('Error removing user:', err);
                return res.status(500).json({ message: 'Error removing user' });
            }
            res.json({ message: 'User removed successfully!' });
        });
    });
});

// Route to remove a book
router.delete('/removeBook/:id', (req, res) => {
    const bookId = req.params.id;
    const sql = 'DELETE FROM books WHERE id = ?';
    db.query(sql, [bookId], (err) => {
        if (err) throw err;
        res.json({ message: 'Book removed successfully!' });
    });
});

// Route to remove a paper
router.delete('/removePaper/:id', (req, res) => {
    const paperId = req.params.id;
    const sql = 'DELETE FROM papers WHERE id = ?';
    db.query(sql, [paperId], (err) => {
        if (err) throw err;
        res.json({ message: 'Paper removed successfully!' });
    });
});


module.exports = router;
