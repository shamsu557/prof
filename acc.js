    $(document).ready(function() {
      // Handle forgot password form submission
      $('#forgotPasswordForm').on('submit', function(event) {
        event.preventDefault();
        const email = $('input[name="email"]').val();

        $.post('/forgot-password', { email: email }, function(data) {
          if (data.success) {
            $('#message').removeClass('alert-danger').addClass('alert-success').text(data.message).show();
            $('#forgotPasswordForm').hide();
            $('#resetPasswordForm').show();
            $('#resetEmail').val(email);
          } else {
            $('#message').removeClass('alert-success').addClass('alert-danger').text(data.message).show();
          }
        });
      });

      // Handle reset password form submission
      $('#resetPasswordForm').on('submit', function(event) {
        event.preventDefault();
        const email = $('#resetEmail').val();
        const newPassword = $('input[name="newPassword"]').val();
        const confirmPassword = $('input[name="confirmPassword"]').val();

        if (newPassword !== confirmPassword) {
          $('#message').removeClass('alert-success').addClass('alert-danger').text('Passwords do not match.').show();
          return;
        }

        $.post('/reset-password', { email: email, newPassword: newPassword }, function(data) {
          if (data.success) {
            $('#message').removeClass('alert-danger').addClass('alert-success').text(data.message).show();
            setTimeout(function() {
              window.location.href = '/login'; // Redirect to login page
            }, 2000); // Delay to show the message before redirect
          } else {
            $('#message').removeClass('alert-success').addClass('alert-danger').text(data.message).show();
          }
        });
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

    