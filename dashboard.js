    // Function to check authentication status
    function checkAuth() {
      fetch('/auth-check')
      .then(response => response.json())
      .then(data => {
        if (!data.authenticated) {
          // Redirect to admin login if not authenticated
          window.location.href = '/adminLogin';
        }
      })
      .catch(err => {
        console.error('Error checking authentication:', err);
      });
    }

    // Check authentication status on page load
    window.onload = function() {
      checkAuth();
    };

  // Also check authentication status when navigating back/forward
  window.onpageshow = function(event) {
      if (event.persisted) {
          checkAuth();
      }
  };
  function logout() {
  window.location.href = '/adminLogout'; // Redirect to admin logout route
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