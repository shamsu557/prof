// Function to show the "Add Resource" options
function showResourceOptions() {
    document.getElementById('addResourceSection').classList.remove('hidden');
    document.getElementById('addBookSection').classList.add('hidden');
    document.getElementById('addPaperSection').classList.add('hidden');
}

// Event listeners for showing add forms
document.getElementById('selectAddBook').addEventListener('click', function() {
    document.getElementById('addResourceSection').classList.add('hidden');
    document.getElementById('addBookSection').classList.remove('hidden');
});

document.getElementById('selectAddPaper').addEventListener('click', function() {
    document.getElementById('addResourceSection').classList.add('hidden');
    document.getElementById('addPaperSection').classList.remove('hidden');
});

// Back to Add Resource selection
document.getElementById('backToResource').addEventListener('click', showResourceOptions);
document.getElementById('backToResourceFromPaper').addEventListener('click', showResourceOptions);

// Fetch and display existing resources on page load
async function fetchResources() {
    try {
        const [booksResponse, papersResponse] = await Promise.all([
            fetch('/admin/getBooks'),
            fetch('/admin/getPapers')
        ]);
        const books = await booksResponse.json();
        const papers = await papersResponse.json();

        const booksList = document.getElementById('booksList');
        const papersList = document.getElementById('papersList');

        // Populate books list
        booksList.innerHTML = books.map(book => `
            <li class="list-group-item">
                ${book.bookTitle} 
                <button class="btn btn-danger btn-sm float-right" onclick="confirmRemoveBook(${book.id}, '${book.bookTitle}')">Remove</button>
            </li>
        `).join('');

        // Populate papers list
        papersList.innerHTML = papers.map(paper => `
            <li class="list-group-item">
                ${paper.paperTitle} 
                <button class="btn btn-danger btn-sm float-right" onclick="confirmRemovePaper(${paper.id}, '${paper.paperTitle}')">Remove</button>
            </li>
        `).join('');
    } catch (error) {
        console.error('Error fetching resources:', error);
    }
}

// Add Book Form Submission
document.getElementById('addBookForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = new FormData(this);

    // Prompt for admin credentials
    const username = prompt("Enter your username:");
    const password = prompt("Enter your password:");

    // Append admin credentials to the form data
    formData.append('username', username);
    formData.append('password', password);

    // Check if user wants to upload to OneDrive
    const uploadToOnedrive = confirm("Do you want to upload this book to OneDrive?");
    if (uploadToOnedrive) {
        await uploadToOneDrive(formData);
    } else {
        try {
            const response = await fetch('/admin/addBook', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to upload book');
            }

            alert('Book added successfully!');
            fetchResources(); // Refresh the list
        } catch (error) {
            console.error('Error adding book:', error);
            alert('Error adding book: ' + error.message);
        }
    }
});

// Add Paper Form Submission
document.getElementById('addPaperForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = new FormData(this);

    // Prompt for admin credentials
    const username = prompt("Enter your username:");
    const password = prompt("Enter your password:");

    // Append admin credentials to the form data
    formData.append('username', username);
    formData.append('password', password);

    // Check if user wants to upload to OneDrive
    const uploadToOnedrive = confirm("Do you want to upload this paper to OneDrive?");
    if (uploadToOnedrive) {
        await uploadToOneDrive(formData);
    } else {
        try {
            const response = await fetch('/admin/addPaper', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to upload paper');
            }

            alert('Paper added successfully!');
            fetchResources(); // Refresh the list
        } catch (error) {
            console.error('Error adding paper:', error);
            alert('Error adding paper: ' + error.message);
        }
    }
});

// Function to handle OneDrive upload
async function uploadToOneDrive(formData) {
    try {
        const response = await fetch('/admin/uploadToOneDrive', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to upload to OneDrive');
        }

        alert('File uploaded to OneDrive successfully!');
    } catch (error) {
        console.error('Error uploading to OneDrive:', error);
        alert('Error uploading to OneDrive: ' + error.message);
    }
}

// Confirm and remove book
async function confirmRemoveBook(bookId, bookTitle) {
    const adminUsername = prompt('Enter your admin username:');
    const password = prompt('Enter your admin password to confirm removal:');
    
    if (adminUsername && password) {
        const isConfirmed = confirm(`Are you sure you want to remove book: ${bookTitle}?`);
        if (isConfirmed) {
            try {
                const response = await fetch(`/admin/removeBook/${bookId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username: adminUsername, password: password })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to remove book');
                }

                alert('Book removed successfully!');
                fetchResources(); // Refresh the list
            } catch (error) {
                console.error('Error removing book:', error);
                alert('Error removing book: ' + error.message);
            }
        }
    }
}

// Confirm and remove paper
async function confirmRemovePaper(paperId, paperTitle) {
    const adminUsername = prompt('Enter your admin username:');
    const password = prompt('Enter your admin password to confirm removal:');
    
    if (adminUsername && password) {
        const isConfirmed = confirm(`Are you sure you want to remove paper: ${paperTitle}?`);
        if (isConfirmed) {
            try {
                const response = await fetch(`/admin/removePaper/${paperId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username: adminUsername, password: password })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to remove paper');
                }

                alert('Paper removed successfully!');
                fetchResources(); // Refresh the list
            } catch (error) {
                console.error('Error removing paper:', error);
                alert('Error removing paper: ' + error.message);
            }
        }
    }
}

// Fetch resources on page load
fetchResources();

// Admin logout functionality
function logout() {
    fetch('/adminLogout', { method: 'POST' })
        .then(() => window.location.href = '/admin-login.html')
        .catch(err => console.error('Logout failed', err));
}

// Back to top button functionality
window.onscroll = function() { scrollFunction() };

function scrollFunction() {
    if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
        document.getElementById("myBtn").style.display = "block";
    } else {
        document.getElementById("myBtn").style.display = "none";
    }
}

function topFunction() {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
}
