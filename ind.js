        // Fetch and display books
        async function fetchBooks() {
            try {
                const response = await fetch('/api/books'); // Fetch books from your API endpoint
                const books = await response.json();
                const bookList = document.getElementById('book-list');
                
                books.forEach(book => {
                    const bookCard = document.createElement('div');
                    bookCard.className = 'col-md-4 resource-card book-item';
                    bookCard.setAttribute('data-title', book.bookTitle.toLowerCase());
                    bookCard.innerHTML = `
                        <div class="card">
                            <img src="${book.image}" alt="${book.bookTitle}" class="card-img-top resource-image">
                            <div class="card-body">
                                <h5 class="card-title">${book.bookTitle}</h5>
                            </div>
                        </div>
                    `;
                    bookList.appendChild(bookCard);
                });
            } catch (error) {
                console.error('Error fetching books:', error);
            }
        }
  
        // Fetch and display papers
        async function fetchPapers() {
            try {
                const response = await fetch('/api/papers'); // Fetch papers from your API endpoint
                const papers = await response.json();
                const paperList = document.getElementById('papers-list');
                
                papers.forEach(paper => {
                    const paperCard = document.createElement('div');
                    paperCard.className = 'col-md-4 resource-card paper-item';
                    paperCard.setAttribute('data-title', paper.paperTitle.toLowerCase());
                    paperCard.innerHTML = `
                        <div class="card">
                            <img src="${paper.image}" alt="${paper.paperTitle}" class="card-img-top resource-image">
                            <div class="card-body">
                                <h5 class="card-title">${paper.paperTitle}</h5>
                            </div>
                        </div>
                    `;
                    paperList.appendChild(paperCard);
                });
            } catch (error) {
                console.error('Error fetching papers:', error);
            }
        }
        
        //hover about professor 
        const image = document.querySelector('.fixed-image');
  const hoverMessage = document.getElementById('hoverMessage');

  image.addEventListener('mouseenter', function() {
    hoverMessage.style.display = 'block';
  });

  image.addEventListener('mouseleave', function() {
    hoverMessage.style.display = 'none';
  });
        // Filter resources based on search input
        function filterResources() {
            const searchInput = document.getElementById('searchInput').value.toLowerCase();
            const bookItems = document.querySelectorAll('.book-item');
            const paperItems = document.querySelectorAll('.paper-item');
  
            bookItems.forEach(item => {
                const title = item.getAttribute('data-title');
                if (title.includes(searchInput)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
  
            paperItems.forEach(item => {
                const title = item.getAttribute('data-title');
                if (title.includes(searchInput)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        }
  
        // Back to top button functionality
        window.onscroll = function() {scrollFunction()};
  
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
      
        // Fetch the resources after the page loads
        document.addEventListener('DOMContentLoaded', () => {
            fetchBooks();
            fetchPapers();
            checkAuth();
        });
         // Show modal automatically after 3 seconds
    $(document).ready(function() {
      setTimeout(function() {
        $('#professorModal').modal('show');
      }, 3000);
    });
    