const USEBASIN_ENDPOINT = '';

document.getElementById('contactForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!USEBASIN_ENDPOINT) {
        showMessage('Form endpoint not yet configured. Please contact the administrator.', 'error');
        return;
    }

    const form = e.target;
    const formData = new FormData(form);

    try {
        const submitBtn = form.querySelector('.submit-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;

        const response = await fetch(USEBASIN_ENDPOINT, {
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            showMessage('Thank you! We\'ll get back to you soon.', 'success');
            form.reset();
        } else {
            showMessage('Something went wrong. Please try again.', 'error');
        }

        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    } catch (error) {
        console.error('Form submission error:', error);
        showMessage('Error submitting form. Please try again.', 'error');

        const submitBtn = form.querySelector('.submit-btn');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

function showMessage(message, type) {
    const messageDiv = document.getElementById('formMessage');
    messageDiv.textContent = message;
    messageDiv.className = `form-message ${type}`;
    messageDiv.style.display = 'block';

    if (type === 'success') {
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }
}
