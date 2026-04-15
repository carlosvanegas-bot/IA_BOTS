// Initialize Lucide icons
lucide.createIcons();

// Copy to Clipboard Functionality
document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        const url = btn.getAttribute('data-url');
        const originalText = btn.innerHTML;
        
        try {
            await navigator.clipboard.writeText(url);
            
            // Visual feedback
            if (btn.classList.contains('btn-sm')) {
                btn.innerHTML = `Copied!`;
                btn.style.borderColor = '#00FFFF'; // neon-cyan
                btn.style.color = '#00FFFF';
                btn.style.background = 'rgba(0, 255, 255, 0.1)';
            } else {
                btn.innerHTML = `<i data-lucide="check" style="color: #00FFFF;"></i> Copied!`;
                lucide.createIcons();
                btn.style.borderColor = '#00FFFF';
            }
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                if (!btn.classList.contains('btn-sm')) {
                    lucide.createIcons();
                }
                btn.style.borderColor = '';
                if (btn.classList.contains('btn-sm')) {
                    btn.style.color = '';
                    btn.style.background = '';
                }
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            btn.innerHTML = `Failed`;
            if (!btn.classList.contains('btn-sm')) {
                btn.innerHTML = `<i data-lucide="x" style="color: #ef4444;"></i> Failed`;
                lucide.createIcons();
            }
            setTimeout(() => {
                btn.innerHTML = originalText;
                if (!btn.classList.contains('btn-sm')) {
                    lucide.createIcons();
                }
            }, 2000);
        }
    });
});

// Add subtle parallax effect to orbs based on mouse movement
document.addEventListener('mousemove', (e) => {
    const orbs = document.querySelectorAll('.orb');
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    
    orbs.forEach((orb, index) => {
        const speed = index === 0 ? 30 : -20;
        const xOffset = (x - 0.5) * speed;
        const yOffset = (y - 0.5) * speed;
        
        orb.style.transform = `translate(${xOffset}px, ${yOffset}px) scale(${1.1})`;
    });
});
