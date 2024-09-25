    document.getElementById('signup-form').addEventListener('submit', function(event) {
      event.preventDefault(); 

      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      if (password !== confirmPassword) {
        document.getElementById('message').textContent = 'Passwords do not match.';
        document.getElementById('message').style.display = 'block';
        return; 
      } else {
        document.getElementById('message').style.display = 'none';
      }

      const formData = new FormData(event.target);

      fetch('/signup', {
        method: 'POST',
        body: new URLSearchParams(formData)
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert(data.message);
          window.location.href = data.redirectUrl; 
        } else {
          alert(data.message); 
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
      });
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
