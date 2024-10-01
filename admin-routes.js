const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const axios = require('axios'); // For making API calls
const router = express.Router();
const db = require('./mysql'); // Your MySQL configuration file
const bcrypt = require('bcryptjs');

const clientId = '55d85c04-778f-4e52-9f5d-5079b7b12d35'; // From Microsoft Azure
const clientSecret = '57bfbedf-c735-4fe6-a7f3-94ba8893e4c2'; // From Microsoft Azure
const tenantId = 'a8d3019e-aba7-4627-886e-fcd4128c8656'; // From Microsoft Azure
const redirectUri = 'https://prof-publications.onrender.com/auth/callback'; // Your redirect URI
const folderName = 'prof-upload'; // OneDrive folder

// Serve static files (HTML, CSS, JS)
router.use(express.static(path.join(__dirname)));

// Multer setup for handling file uploads (before sending them to OneDrive)
const storage = multer.memoryStorage(); // Store files in memory to send them to OneDrive
const upload = multer({ storage: storage });

// Function to get access token for OneDrive API
async function getAccessToken() {
    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('scope', 'https://graph.microsoft.com/.default');
    params.append('client_secret', clientSecret);
    params.append('grant_type', 'client_credentials');

    try {
        const response = await axios.post(tokenEndpoint, params);
        return response.data.access_token;
    } catch (error) {
        console.error('Error fetching access token:', error.response?.data || error.message);
        throw new Error('Failed to get access token');
    }
}

// Function to upload files to OneDrive
async function uploadToOneDrive(accessToken, fileBuffer, fileName, folderName) {
    const uploadEndpoint = `https://graph.microsoft.com/v1.0/me/drive/root:/${folderName}/${fileName}:/content`;

    try {
        const response = await axios.put(uploadEndpoint, fileBuffer, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/octet-stream'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error uploading file to OneDrive:', error.response?.data || error.message);
        throw new Error('Failed to upload file to OneDrive');
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

// Route to add a book and upload it to OneDrive
router.post('/addBook', upload.fields([{ name: 'bookFile' }, { name: 'bookImage' }]), async (req, res) => {
    const { bookTitle, username, password } = req.body;
    const bookFile = req.files['bookFile'][0];
    const bookImage = req.files['bookImage'][0];
    const dateAdded = new Date();

    try {
        // Check if admin exists and verify password
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

            // Check if the book title already exists
            const sqlCheckBook = 'SELECT * FROM books WHERE bookTitle = ?';
            db.query(sqlCheckBook, [bookTitle], async (err, result) => {
                if (err) throw err;
                if (result.length > 0) {
                    return res.status(400).json({ message: 'Book with this title already exists' });
                }

                // Get access token for OneDrive
                const accessToken = await getAccessToken();

                // Upload book file and image to OneDrive
                const uploadedBookFile = await uploadToOneDrive(accessToken, bookFile.buffer, bookFile.originalname, folderName);
                const uploadedBookImage = await uploadToOneDrive(accessToken, bookImage.buffer, bookImage.originalname, folderName);

                // Insert the book into the database
                const sqlInsertBook = 'INSERT INTO books (bookTitle, file_name, date_added, image) VALUES (?, ?, ?, ?)';
                db.query(sqlInsertBook, [bookTitle, uploadedBookFile.id, dateAdded, uploadedBookImage.id], (err) => {
                    if (err) throw err;
                    res.status(201).json({ message: 'Book added successfully!', file: uploadedBookFile, image: uploadedBookImage });
                });
            });
        });
    } catch (error) {
        console.error('Error processing book upload:', error);
        res.status(500).json({ message: 'Error uploading book to OneDrive' });
    }
});

// Route to add a paper and upload it to OneDrive (similar to books)
router.post('/addPaper', upload.fields([{ name: 'paperFile' }, { name: 'paperImage' }]), async (req, res) => {
    const { paperTitle, username, password } = req.body;
    const paperFile = req.files['paperFile'][0];
    const paperImage = req.files['paperImage'][0];
    const dateAdded = new Date();

    try {
        // Check if admin exists and verify password
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

            // Check if the paper title already exists
            const sqlCheckPaper = 'SELECT * FROM papers WHERE paperTitle = ?';
            db.query(sqlCheckPaper, [paperTitle], async (err, result) => {
                if (err) throw err;
                if (result.length > 0) {
                    return res.status(400).json({ message: 'Paper with this title already exists' });
                }

                // Get access token for OneDrive
                const accessToken = await getAccessToken();

                // Upload paper file and image to OneDrive
                const uploadedPaperFile = await uploadToOneDrive(accessToken, paperFile.buffer, paperFile.originalname, folderName);
                const uploadedPaperImage = await uploadToOneDrive(accessToken, paperImage.buffer, paperImage.originalname, folderName);

                // Insert the paper into the database
                const sqlInsertPaper = 'INSERT INTO papers (paperTitle, file_name, date_added, image) VALUES (?, ?, ?, ?)';
                db.query(sqlInsertPaper, [paperTitle, uploadedPaperFile.id, dateAdded, uploadedPaperImage.id], (err) => {
                    if (err) throw err;
                    res.status(201).json({ message: 'Paper added successfully!', file: uploadedPaperFile, image: uploadedPaperImage });
                });
            });
        });
    } catch (error) {
        console.error('Error processing paper upload:', error);
        res.status(500).json({ message: 'Error uploading paper to OneDrive' });
    }
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
router.delete('/removeBook/:id', async (req, res) => {
    const bookId = req.params.id;
    const { username, password } = req.body;

    // Log incoming request details
    console.log(`Removing book with ID: ${bookId}, Username: ${username}`);

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

        // If admin is valid, proceed to delete the book
        const sqlDeleteBook = 'DELETE FROM books WHERE id = ? ';
        db.query(sqlDeleteBook, [bookId], (err, result) => {
            if (err) {
                console.error('Error removing book:', err);
                return res.status(500).json({ message: 'Error removing book' });
            }
            console.log(`Book with ID ${bookId} removed successfully.`);
            res.json({ message: 'Book removed successfully!' });
        });
    });
});

// Route to remove a paper
router.delete('/removePaper/:id', async (req, res) => {
    const paperId = req.params.id;
    const { username, password } = req.body;

    // Log incoming request details
    console.log(`Removing paper with ID: ${paperId}, Username: ${username}`);

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

        // If admin is valid, proceed to delete the paper
        const sqlDeletePaper = 'DELETE FROM papers WHERE id = ?';
        db.query(sqlDeletePaper, [paperId], (err, result) => {
            if (err) {
                console.error('Error removing paper:', err);
                return res.status(500).json({ message: 'Error removing paper' });
            }
            console.log(`Paper with ID ${paperId} removed successfully.`);
            res.json({ message: 'Paper removed successfully!' });
        });
    });
});

module.exports = router;