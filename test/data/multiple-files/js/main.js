// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Dark mode toggle
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
    });

    // Animation button
    const animateBtn = document.querySelector('.animate-btn');
    animateBtn.addEventListener('click', () => {
        const card = animateBtn.closest('.feature-card');
        card.classList.add('animate');
        setTimeout(() => {
            card.classList.remove('animate');
        }, 1000);
    });

    // Counter functionality
    let count = 0;
    const counterDisplay = document.getElementById('counter');
    const counterBtn = document.querySelector('.counter-btn');
    
    counterBtn.addEventListener('click', () => {
        count++;
        counterDisplay.textContent = count;
    });

    // Text input functionality
    const textInput = document.getElementById('textInput');
    const textOutput = document.getElementById('textOutput');

    textInput.addEventListener('input', (e) => {
        textOutput.textContent = e.target.value;
    });

    // Navigation active state
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
}); 