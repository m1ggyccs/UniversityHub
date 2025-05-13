// Validate QR code for event check-in/registration
function validateEventQR(eventId) {
  fetch('http://localhost:3000/api/events/scan-qr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId })
  })
    .then(res => res.json())
    .then(result => {
      if (result.message === 'QR code is valid') {
        alert('Check-in successful!');
      } else {
        alert('Invalid QR code!');
      }
    });
}

// Example usage: call validateEventQR(eventId) after scanning a QR code
