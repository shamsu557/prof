const express = require('express');
const path = require('path');
const router = express.Router();
const db = require('./mysql'); // Your MySQL configuration file

// Serve static files (HTML, CSS, JS)
router.use(express.static(path.join(__dirname))); // Serving static files

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



module.exports = router;
