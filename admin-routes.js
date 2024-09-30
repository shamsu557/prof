const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const multer = require('multer');
const db = require('./mysql'); // Your MySQL configuration file
const bcrypt = require('bcryptjs');
const axios = require('axios');

// Serve static files (HTML, CSS, JS)
router.use(express.static(path.join(__dirname))); // Serving static files

// Set up storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}${path.extname(file.originalname)}`); // Append timestamp to filename
    }
});

const upload = multer({ storage: storage });

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
router.get('/stats', async (req, res) => {
    try {
        const sqlUsersCount = 'SELECT COUNT(*) AS count FROM users';
        const sqlBooksCount = 'SELECT COUNT(*) AS count FROM books';
        const sqlPapersCount = 'SELECT COUNT(*) AS count FROM papers';

        const [userResult] = await db.query(sqlUsersCount);
        const [booksResult] = await db.query(sqlBooksCount);
        const [papersResult] = await db.query(sqlPapersCount);

        res.json({
            usersCount: userResult.count,
            booksCount: booksResult.count,
            papersCount: papersResult.count,
        });
    } catch (err) {
        console.error('Error fetching stats:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Middleware to check if admin is authenticated
router.get('/is-logged-in', (req, res) => {
    res.json({ isLoggedIn: !!req.session.isAdmin });
});

// Route to get all books
router.get('/getBooks', async (req, res) => {
    try {
        const sql = 'SELECT * FROM books';
        const results = await db.query(sql);
        res.json(results);
    } catch (err) {
        console.error('Error fetching books:', err);
        res.status(500).json({ message: 'Error fetching books' });
    }
});

// Route to get all papers
router.get('/getPapers', async (req, res) => {
    try {
        const sql = 'SELECT * FROM papers';
        const results = await db.query(sql);
        res.json(results);
    } catch (err) {
        console.error('Error fetching papers:', err);
        res.status(500).json({ message: 'Error fetching papers' });
    }
});

// Function to verify admin credentials
async function verifyAdmin(username, password) {
    const sqlCheckAdmin = 'SELECT * FROM admins WHERE username = ?';
    const [adminResult] = await db.query(sqlCheckAdmin, [username]);

    if (!adminResult || adminResult.length === 0) {
        throw new Error('Invalid admin credentials');
    }

    const admin = adminResult[0];
    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
        throw new Error('Invalid admin credentials');
    }

    return admin;
}

// Route to add a book
router.post('/addBook', upload.fields([{ name: 'bookFile' }, { name: 'bookImage' }]), async (req, res) => {
    const { bookTitle, username, password } = req.body;
    const bookFile = req.files['bookFile'][0];
    const bookImage = req.files['bookImage'][0];
    const dateAdded = new Date();

    try {
        await verifyAdmin(username, password);

        const sqlCheckBook = 'SELECT * FROM books WHERE bookTitle = ?';
        const [bookExists] = await db.query(sqlCheckBook, [bookTitle]);
        if (bookExists.length > 0) {
            return res.status(400).json({ message: 'Book with this title already exists' });
        }

        const fileBuffer = fs.readFileSync(bookFile.path);
        const imageBuffer = fs.readFileSync(bookImage.path);

        const bookFileResponse = await uploadToOneDrive(`${bookTitle}.pdf`, fileBuffer, 'Books');
        const bookImageResponse = await uploadToOneDrive(`${bookTitle}-image.jpg`, imageBuffer, 'BookImages');

        const sqlInsertBook = 'INSERT INTO books (bookTitle, file_name, date_added, image) VALUES (?, ?, ?, ?)';
        await db.query(sqlInsertBook, [bookTitle, bookFileResponse.id, dateAdded, bookImageResponse.id]);

        res.status(201).json({ message: 'Book added successfully!' });
    } catch (error) {
        console.error('Error adding book:', error);
        res.status(500).json({ message: error.message || 'Failed to add book' });
    }
});

// Route to add a paper
router.post('/addPaper', upload.fields([{ name: 'paperFile' }, { name: 'paperImage' }]), async (req, res) => {
    const { paperTitle, username, password } = req.body;
    const paperFile = req.files['paperFile'][0];
    const paperImage = req.files['paperImage'][0];
    const dateAdded = new Date();

    try {
        await verifyAdmin(username, password);

        const sqlCheckPaper = 'SELECT * FROM papers WHERE paperTitle = ?';
        const [paperExists] = await db.query(sqlCheckPaper, [paperTitle]);
        if (paperExists.length > 0) {
            return res.status(400).json({ message: 'Paper with this title already exists' });
        }

        const fileBuffer = fs.readFileSync(paperFile.path);
        const imageBuffer = fs.readFileSync(paperImage.path);

        const paperFileResponse = await uploadToOneDrive(`${paperTitle}.pdf`, fileBuffer, 'Papers');
        const paperImageResponse = await uploadToOneDrive(`${paperTitle}-image.jpg`, imageBuffer, 'PaperImages');

        const sqlInsertPaper = 'INSERT INTO papers (paperTitle, file_name, date_added, image) VALUES (?, ?, ?, ?)';
        await db.query(sqlInsertPaper, [paperTitle, paperFileResponse.id, dateAdded, paperImageResponse.id]);

        res.status(201).json({ message: 'Paper added successfully!' });
    } catch (error) {
        console.error('Error adding paper:', error);
        res.status(500).json({ message: error.message || 'Failed to add paper' });
    }
});

// Route to get all users
router.get('/getUsers', async (req, res) => {
    try {
        const sql = 'SELECT id, fullname, email, created_at FROM users';
        const results = await db.query(sql);
        res.json(results);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ message: 'Error fetching users' });
    }
});

// Route to remove a user
router.delete('/removeUser/:id', async (req, res) => {
    const userId = req.params.id;
    const { username, password } = req.body;

    try {
        await verifyAdmin(username, password);

        const sqlDeleteUser = 'DELETE FROM users WHERE id = ?';
        await db.query(sqlDeleteUser, [userId]);

        res.json({ message: 'User removed successfully!' });
    } catch (error) {
        console.error('Error removing user:', error);
        res.status(500).json({ message: error.message || 'Error removing user' });
    }
});

// Route to remove a book
router.delete('/removeBook/:id', async (req, res) => {
    const bookId = req.params.id;
    const { username, password } = req.body;

    try {
        await verifyAdmin(username, password);

        const sqlDeleteBook = 'DELETE FROM books WHERE id = ?';
        await db.query(sqlDeleteBook, [bookId]);

        res.json({ message: 'Book removed successfully!' });
    } catch (error) {
        console.error('Error removing book:', error);
        res.status(500).json({ message: error.message || 'Error removing book' });
    }
});

// Route to remove a paper
router.delete('/removePaper/:id', async (req, res) => {
    const paperId = req.params.id;
    const { username, password } = req.body;

    try {
        await verifyAdmin(username, password);

        const sqlDeletePaper = 'DELETE FROM papers WHERE id = ?';
        await db.query(sqlDeletePaper, [paperId]);

        res.json({ message: 'Paper removed successfully!' });
    } catch (error) {
        console.error('Error removing paper:', error);
        res.status(500).json({ message: error.message || 'Error removing paper' });
    }
});

module.exports = router;
