const express = require('express');
const path = require('path');
const axios = require('axios');
const router = express.Router();
const db = require('./mysql'); // Your MySQL configuration file
const bcrypt = require('bcryptjs');

// Constants for OneDrive API
const ONEDRIVE_API_BASE = 'https://graph.microsoft.com/v1.0/me/drive';
const ONE_DRIVE_UPLOAD_URL = `${ONEDRIVE_API_BASE}/root:/prof-uploads/`;
const ONEDRIVE_ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN'; // Replace with your access token

// Helper function to upload file to OneDrive
async function uploadToOneDrive(fileName, fileBuffer, folderName) {
    try {
        const uploadUrl = `${ONE_DRIVE_UPLOAD_URL}${folderName}/${fileName}:/content`;

        const response = await axios.put(uploadUrl, fileBuffer, {
            headers: {
                'Authorization': `Bearer ${ONEDRIVE_ACCESS_TOKEN}`,
                'Content-Type': 'application/octet-stream',
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error uploading to OneDrive:', error.response?.data || error.message);
        throw new Error('Failed to upload to OneDrive');
    }
}

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

// Route to get all users
router.get('/getUsers', (req, res) => {
    const sql = 'SELECT id, fullname, email, created_at FROM users';
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
    const { username, password } = req.body;

    const sqlCheckAdmin = 'SELECT * FROM admins WHERE username = ?';

    db.query(sqlCheckAdmin, [username], async (err, adminResult) => {
        if (err || adminResult.length === 0) {
            return res.status(403).json({ message: 'Invalid admin credentials' });
        }

        const admin = adminResult[0];
        const match = await bcrypt.compare(password, admin.password);
        if (!match) {
            return res.status(403).json({ message: 'Invalid admin credentials' });
        }

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

// Middleware to check if admin is authenticated
router.get('/is-logged-in', (req, res) => {
    res.json({ isLoggedIn: !!req.session.isAdmin });
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

// Route to add a book (OneDrive upload)
router.post('/addBook', async (req, res) => {
    const { bookTitle, username, password, fileBuffer, imageBuffer } = req.body;
    const dateAdded = new Date();

    const sqlCheckAdmin = 'SELECT * FROM admins WHERE username = ?';

    db.query(sqlCheckAdmin, [username], async (err, adminResult) => {
        if (err || adminResult.length === 0) {
            return res.status(403).json({ message: 'Invalid admin credentials' });
        }

        const admin = adminResult[0];
        const match = await bcrypt.compare(password, admin.password);
        if (!match) {
            return res.status(403).json({ message: 'Invalid admin credentials' });
        }

        const sqlCheckBook = 'SELECT * FROM books WHERE bookTitle = ?';
        db.query(sqlCheckBook, [bookTitle], async (err, result) => {
            if (err) throw err;
            if (result.length > 0) {
                return res.status(400).json({ message: 'Book with this title already exists' });
            }

            try {
                const bookFile = await uploadToOneDrive(`${bookTitle}.pdf`, fileBuffer, 'Books');
                const bookImage = await uploadToOneDrive(`${bookTitle}-image.jpg`, imageBuffer, 'BookImages');

                const sqlInsertBook = 'INSERT INTO books (bookTitle, file_name, date_added, image) VALUES (?, ?, ?, ?)';
                db.query(sqlInsertBook, [bookTitle, bookFile.id, dateAdded, bookImage.id], (err) => {
                    if (err) throw err;
                    res.status(201).json({ message: 'Book added successfully!' });
                });
            } catch (error) {
                res.status(500).json({ message: 'Failed to upload book to OneDrive' });
            }
        });
    });
});

// Route to add a paper (OneDrive upload)
router.post('/addPaper', async (req, res) => {
    const { paperTitle, username, password, fileBuffer, imageBuffer } = req.body;
    const dateAdded = new Date();

    const sqlCheckAdmin = 'SELECT * FROM admins WHERE username = ?';

    db.query(sqlCheckAdmin, [username], async (err, adminResult) => {
        if (err || adminResult.length === 0) {
            return res.status(403).json({ message: 'Invalid admin credentials' });
        }

        const admin = adminResult[0];
        const match = await bcrypt.compare(password, admin.password);
        if (!match) {
            return res.status(403).json({ message: 'Invalid admin credentials' });
        }

        const sqlCheckPaper = 'SELECT * FROM papers WHERE paperTitle = ?';
        db.query(sqlCheckPaper, [paperTitle], async (err, result) => {
            if (err) throw err;
            if (result.length > 0) {
                return res.status(400).json({ message: 'Paper with this title already exists' });
            }

            try {
                const paperFile = await uploadToOneDrive(`${paperTitle}.pdf`, fileBuffer, 'Papers');
                const paperImage = await uploadToOneDrive(`${paperTitle}-image.jpg`, imageBuffer, 'PaperImages');

                const sqlInsertPaper = 'INSERT INTO papers (paperTitle, file_name, date_added, image) VALUES (?, ?, ?, ?)';
                db.query(sqlInsertPaper, [paperTitle, paperFile.id, dateAdded, paperImage.id], (err) => {
                    if (err) throw err;
                    res.status(201).json({ message: 'Paper added successfully!' });
                });
            } catch (error) {
                res.status(500).json({ message: 'Failed to upload paper to OneDrive' });
            }
        });
    });
});

// Route to remove a book
router.delete('/removeBook/:id', async (req, res) => {
    const bookId = req.params.id;
    const { username, password } = req.body;

    const sqlCheckAdmin = 'SELECT * FROM admins WHERE username = ?';

    db.query(sqlCheckAdmin, [username], async (err, adminResult) => {
        if (err || adminResult.length === 0) {
            return res.status(403).json({ message: 'Invalid admin credentials' });
        }

        const admin = adminResult[0];
        const match = await bcrypt.compare(password, admin.password);
        if (!match) {
            return res.status(403).json({ message: 'Invalid admin credentials' });
        }

        const sqlDeleteBook = 'DELETE FROM books WHERE id = ?';
        db.query(sqlDeleteBook, [bookId], (err) => {
            if (err) {
                console.error('Error removing book:', err);
                return res.status(500).json({ message: 'Error removing book' });
            }
            res.json({ message: 'Book removed successfully!' });
        });
    });
});

// Route to remove a paper
router.delete('/removePaper/:id', async (req, res) => {
    const paperId = req.params.id;
    const { username, password } = req.body;

    const sqlCheckAdmin = 'SELECT * FROM admins WHERE username = ?';

    db.query(sqlCheckAdmin, [username], async (err, adminResult) => {
        if (err || adminResult.length === 0) {
            return res.status(403).json({ message: 'Invalid admin credentials' });
        }

        const admin = adminResult[0];
        const match = await bcrypt.compare(password, admin.password);
        if (!match) {
            return res.status(403).json({ message: 'Invalid admin credentials' });
        }

        const sqlDeletePaper = 'DELETE FROM papers WHERE id = ?';
        db.query(sqlDeletePaper, [paperId], (err) => {
            if (err) {
                console.error('Error removing paper:', err);
                return res.status(500).json({ message: 'Error removing paper' });
            }
            res.json({ message: 'Paper removed successfully!' });
        });
    });
});

// Export the router
module.exports = router;
