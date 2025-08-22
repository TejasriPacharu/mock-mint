# Mock Mint Backend API

The Mock Mint Backend API provides robust services for mock data generation, schema management, and user authentication, supporting the Mock Mint application ecosystem.

## Features

- **Authentication**: Secure JWT-based authentication system with registration, login, and profile management
- **Schema Management**: Create, read, update, and delete mock data schemas with support for public sharing
- **Mock Data Generation**: Generate realistic mock data based on schemas in various formats (JSON, CSV, SQL)
- **API Integration**: Test and send mock data directly to external APIs
- **Admin Dashboard**: User management and system analytics (for admin users)
- **History Tracking**: Track generation history and statistics

## Tech Stack

- **Node.js & Express**: Fast and minimalist web framework
- **MongoDB & Mongoose**: Flexible document database with elegant modeling
- **JWT Authentication**: Secure token-based authentication
- **Express Validator**: Input validation and sanitization
- **Helmet & CORS**: Security middleware for HTTP headers and cross-origin requests

## Prerequisites

- Node.js (v18 or later)
- MongoDB (local or remote instance)
- npm or yarn

## Installation

1. Clone the repository
2. Navigate to the backend directory:
   ```
   cd mock-mint/backend
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```
5. Modify the `.env` file with your specific configuration

## Configuration

The following environment variables can be configured in the `.env` file:

| Variable               | Description                                  | Default                         |
|------------------------|----------------------------------------------|--------------------------------|
| PORT                   | Port on which the server will run            | 5000                            |
| NODE_ENV               | Environment (development, production, test)  | development                     |
| MONGODB_URI            | MongoDB connection string                    | mongodb://localhost:27017/mockmint |
| JWT_SECRET             | Secret key for JWT token signing             | (random string)                 |
| JWT_EXPIRES_IN         | JWT token expiration period                  | 30d                             |
| RATE_LIMIT_WINDOW_MS   | Rate limiting window in milliseconds         | 900000 (15 minutes)            |
| RATE_LIMIT_MAX_REQUESTS| Maximum requests per window                  | 100                             |
| ALLOWED_ORIGINS        | CORS allowed origins (comma-separated)       | http://localhost:3000           |

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login with username/email and password
- `POST /api/auth/validate-token` - Validate JWT token
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/me` - Update user profile
- `POST /api/auth/change-password` - Change user password

### Schema Management

- `GET /api/schemas` - Get user's schemas (with filtering, pagination)
- `POST /api/schemas` - Create a new schema
- `GET /api/schemas/:id` - Get schema by ID
- `PUT /api/schemas/:id` - Update schema
- `DELETE /api/schemas/:id` - Delete schema
- `POST /api/schemas/parse` - Parse a schema from various formats
- `GET /api/schemas/public` - Get public schemas

### Data Generation

- `POST /api/generate` - Generate mock data based on schema
- `POST /api/generate/sample` - Generate a sample record
- `POST /api/generate/test-api` - Test API endpoint with sample data
- `GET /api/generate/history` - Get generation history
- `GET /api/generate/stats` - Get user generation statistics

### User Management (Admin)

- `GET /api/users` - Get all users (with filtering, pagination)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `POST /api/users/:id/reset-password` - Reset user password
- `GET /api/users/:id/stats` - Get user statistics
- `GET /api/users/stats` - Get system statistics

## Running the Application

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

## Testing

```bash
npm test
```

## Error Handling

The API uses a consistent error response format:

```json
{
  "error": true,
  "message": "Error description",
  "details": ["Additional error details if available"]
}
```

## License

MIT
