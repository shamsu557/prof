        
async function fetchUsers() {
    try {
        const response = await fetch('/admin/getUsers');
        const users = await response.json();

        const userList = document.getElementById('userList');
        userList.innerHTML = '';

        // Populate user list
        userList.innerHTML = users.map(user => `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                     ${user.fullname}<br>
                     ${user.email}<br>
                    ${new Date(user.created_at).toLocaleString()}
                </div>
                <button class="btn btn-danger btn-sm" onclick="confirmRemoveUser(${user.id}, '${user.fullname}')">Remove User</button>
            </li>
        `).join('');
    } catch (error) {
        console.error('Error fetching users:', error);
    }
}

        async function confirmRemoveUser(userId, username) {
            const adminUsername = prompt('Enter your admin username:');
            const password = prompt('Enter your admin password to confirm removal:');
            
            if (adminUsername && password) {
                const isConfirmed = confirm(`Are you sure you want to remove user: ${username}?`);
                if (isConfirmed) {
                    try {
                        const response = await fetch(`/admin/removeUser/${userId}`, {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ username: adminUsername, password: password })
                        });
    
                        if (!response.ok) {
                            throw new Error('Failed to remove user');
                        }
    
                        alert('User removed successfully!');
                        fetchUsers(); // Refresh the user list
                    } catch (error) {
                        console.error('Error removing user:', error);
                        alert('Error removing user. Please check your credentials or try again.');
                    }
                }
            }
        }
    
    
    window.onload = fetchUsers; // Fetch users on page load

    // Admin logout functionality
function logout() {
    fetch('/adminLogout', { method: 'POST' })
        .then(() => window.location.href = '/admin-login.html')
        .catch(err => console.error('Logout failed', err));
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
