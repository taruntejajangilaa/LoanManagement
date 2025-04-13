# Loan Management System

A full-stack application for managing loans using MongoDB, Express, and React.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation)
- npm or yarn

## Setup

1. Install MongoDB locally and make sure it's running on the default port (27017)

2. Install backend dependencies:
```bash
npm install
```

3. Install frontend dependencies:
```bash
cd client
npm install
```

## Running the Application

1. Start the backend server:
```bash
npm run dev
```

2. In a new terminal, start the frontend development server:
```bash
cd client
npm start
```

3. Open your browser and navigate to `http://localhost:3000`

## Features

- Add new loans
- View all loans in a data grid
- Update loan information
- Delete loans
- Track loan status and payments

## Technologies Used

- Frontend:
  - React
  - Material-UI
  - Axios
  - date-fns

- Backend:
  - Node.js
  - Express
  - MongoDB
  - Mongoose 