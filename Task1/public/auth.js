document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  // Handle Login Submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      showLoader(true);
      try {
        const data = await API.post('/auth/login', { email, password });
        if (data.success) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify({
            _id: data._id,
            name: data.name,
            email: data.email,
            phone: data.phone,
            role: data.role,
            address: data.address
          }));

          showToast('Successfully signed in!', 'success');
          
          // Redirect after toast
          setTimeout(() => {
            // Check if there was a redirect URL, otherwise go home
            window.location.href = '/index.html';
          }, 1000);
        }
      } catch (err) {
        showToast(err.message || 'Login failed. Please check credentials.', 'error');
      } finally {
        showLoader(false);
      }
    });
  }

  // Handle Register Submission
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirm-password').value;

      // Passwords check
      if (password !== confirmPassword) {
        showToast('Passwords do not match!', 'error');
        return;
      }

      showLoader(true);
      try {
        const data = await API.post('/auth/register', { name, email, phone, password });
        if (data.success) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify({
            _id: data._id,
            name: data.name,
            email: data.email,
            phone: data.phone,
            role: data.role,
            address: data.address
          }));

          showToast('Account created successfully!', 'success');
          
          setTimeout(() => {
            window.location.href = '/index.html';
          }, 1000);
        }
      } catch (err) {
        showToast(err.message || 'Registration failed. Try again.', 'error');
      } finally {
        showLoader(false);
      }
    });
  }
});
