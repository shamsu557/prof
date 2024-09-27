$(document).ready(function() {
  // Handle the form submission for forgot password
  $('#forgotPasswordForm').on('submit', function(e) {
    e.preventDefault();
    const email = $('input[name="email"]').val();

    $.post('/forgot-password', { email }, function(response) {
      if (response.success) {
        // Display the security question form
        $('#securityEmail').val(email);
        $('#securityQuestionLabel').text(response.securityQuestion);
        $('#forgotPasswordForm').hide();
        $('#securityQuestionForm').show();
      } else {
        $('#message').text(response.message).show();
      }
    }, 'json');
  });

  // Handle the form submission for validating the security answer
  $('#securityQuestionForm').on('submit', function(e) {
    e.preventDefault();
    const email = $('#securityEmail').val();
    const securityAnswer = $('input[name="securityAnswer"]').val().trim().toUpperCase();

    $.post('/validate-security-answer', { email, securityAnswer }, function(response) {
      if (response.success) {
        // Show the reset password form
        $('#resetEmail').val(email);
        $('#securityQuestionForm').hide();
        $('#resetPasswordForm').show();
      } else {
        $('#message').text(response.message).show();
      }
    }, 'json');
  });

  // Handle the form submission for resetting the password
  $('#resetPasswordForm').on('submit', function(e) {
    e.preventDefault();
    const email = $('#resetEmail').val();
    const newPassword = $('input[name="newPassword"]').val();
    const confirmPassword = $('input[name="confirmPassword"]').val();

    if (newPassword !== confirmPassword) {
      $('#message').text('Passwords do not match.').show();
      return;
    }

    $.post('/reset-password', { email, newPassword }, function(response) {
      $('#message').text(response.message).show();
      if (response.success) {
        setTimeout(() => window.location.href = '/login', 3000); // Redirect after 3 seconds
      }
    }, 'json');
  });
});

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
