 // Initially hide the signup form
    const signupContainer = document.getElementById('signupContainer');
    signupContainer.style.display = 'none';

    // Handle login form submission
    document.getElementById('loginForm').addEventListener('submit', function(event) {
        event.preventDefault();

        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        // Send login credentials to the backend
        fetch('/admin-creation-login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Hide the login form and show the signup form
                document.getElementById('loginContainer').style.display = 'none';
                signupContainer.style.display = 'block';
            } else {
                alert(data.message);
            }
        })
        .catch(error => console.error('Error:', error));
    });

    // Handle signup form submission
    document.getElementById('signupForm').addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent default form submission

        const formData = new FormData(this);
        const data = Object.fromEntries(formData.entries());

        // Send data to the server
        fetch('/admin-signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
        .then(response => response.json())
        .then(result => {
            alert(result.message); // Display the response message

            if (result.success) {
                this.reset(); // Reset the form if signup is successful

                if (result.redirectUrl) {
                    window.location.href = result.redirectUrl; // Redirect if redirectUrl is provided
                }
            }
        })
        .catch(error => console.error('Error:', error));
    });
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
