        async function fetchStats() {
            try {
                const response = await fetch('/admin/stats', {
                    credentials: 'include' // Include credentials for session
                });
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                document.getElementById('usersCount').textContent = data.usersCount;
                document.getElementById('booksCount').textContent = data.booksCount;
                document.getElementById('papersCount').textContent = data.papersCount;

                // Calculate total resources and display
                const totalResources = data.booksCount + data.papersCount;
                document.getElementById('resourcesCount').textContent = totalResources;
            } catch (error) {
                console.error('Error fetching stats:', error);
            }
        }

        // Fetch stats on page load
        window.onload = fetchStats;

        function logout() {
            window.location.href = '/adminLogout'; // Redirect to admin logout route
        }

        // Get the button
        const mybutton = document.getElementById("myBtn");

        // When the user scrolls down 20px from the top of the document, show the button
        window.onscroll = function () {
            scrollFunction();
        };

        function scrollFunction() {
            if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
                mybutton.style.display = "block";
            } else {
                mybutton.style.display = "none";
            }
        }

        // When the user clicks on the button, scroll to the top of the document
        function topFunction() {
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
        }
    