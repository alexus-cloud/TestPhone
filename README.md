# Ringotel Test Softphone

A lightweight web-based softphone built for testing SIP connections with the Ringotel infrastructure. This application provides a simple interface to validate SIP registration, call flow, and media handling.

## 🚀 Tech Stack

- **React 19**: Frontend UI framework.
- **Vite**: Ultra-fast build tool and development server.
- **SIP.js**: A powerful library for SIP signaling and WebRTC media.
- **TypeScript**: Ensuring type safety across the SIP service and UI components.

## ✨ Features

- **SIP Registration**: Easy connection to Ringotel SIP servers.
- **Call Management**:
  - Outbound calling to extensions or phone numbers.
  - Inbound call handling with answer/hangup capabilities.
  - Call Hold and Unhold functionality.
- **Audio Control**: Mute and Unmute local audio stream.
- **Debug Logs**: Integrated logging for monitoring SIP signaling events in real-time.

## 🛠️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (Latest LTS recommended)
- [npm](https://www.npmjs.com/)

### Installation

1. Clone the repository.
2. Install dependencies:

   ```bash
   npm install
   ```

### Configuration

Create a `.env` file in the root directory by copying the example file:

```bash
cp .env.example .env
```

Edit the `.env` file with your Ringotel SIP credentials:

```env
VITE_SIP_SERVER=wss://your-sip-server.ringotel.co
VITE_SIP_USERNAME=your_extension
VITE_SIP_PASSWORD=your_password
VITE_SIP_REALM=your_domain.ringotel.co
```

### Running Locally

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

## 📦 Development

- **Build**: Generate a production-ready bundle in the `dist` folder.

  ```bash
  npm run build
  ```

- **Lint**: Run ESLint to check for code quality issues.
  
  ```bash
  npm run lint
  ```

- **Preview**: Test the production build locally.
  
  ```bash
  npm run preview
  ```

---
© 2026 Ringotel. Designed for testing SIP connectivity.
