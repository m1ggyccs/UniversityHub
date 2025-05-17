<!-- Logo -->
<p align="center">
  <img src="assets/images/university-hub-logo.png" alt="University Hub Logo" width="200"/>
</p>

# University Hub

University Hub is a modern platform designed to streamline university event management, user authentication, and organizational collaboration. Built with Node.js, Express, and MongoDB, it provides a secure and scalable backend for academic communities.


## Project Structure

```
├── assets/
├── css/
├── js/
├── middleware/
├── models/
├── node_modules/
├── pages/
├── routes/
├── .env           # Environment variables (not committed to GitHub)
├── .gitignore
├── config.js      # Centralized configuration
├── package.json
├── server.js
└── README.md
```

## Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/university-hub.git
cd university-hub
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Create a `.env` File
Create a `.env` file in the root directory with the following content:

```env
PORT=3000
API_KEY=your_mongodb_connection_string_here
JWT_SECRET=your_secure_jwt_secret_here
BCRYPT_SALT_ROUNDS=10
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
NODE_ENV=development
```

**Note:** Never commit your `.env` file to GitHub. The `.gitignore` already excludes it.

### 4. Run the Server
```bash
npm start
```

The server will start on the port specified in your `.env` file (default: 3000).

## Deployment (e.g., Render)
- Add all environment variables from your `.env` file to your Render dashboard under the service's environment settings.
- Never expose secrets in your codebase or public repositories.

## Security Best Practices
- **Environment Variables:** All sensitive data is loaded from environment variables.
- **JWT Secret:** Used for signing and verifying authentication tokens. Keep it strong and private.
- **Database URI:** Never expose your MongoDB URI publicly.
- **.env in .gitignore:** Ensures secrets are not pushed to GitHub.

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](LICENSE)

---

<p align="center">
  <b>University Hub</b> &copy; 2024
</p> 
