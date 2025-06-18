# Planning Scrum Poker 🃏

A web application for conducting Planning Poker sessions during Scrum meetings. Allows teams to vote anonymously on user stories and tasks using Scrum Poker cards.

## ✨ Features

- **Real-time sessions** with Firebase synchronization
- **Anonymous voting** until votes are revealed
- **Participant management** with custom nicknames
- **Responsive interface** optimized for desktop and mobile
- **Easy sharing** via session links
- **Automatic authentication** with Firebase Auth

## 🛠️ Technologies Used

- **React 18** - UI Library
- **Vite** - Build tool and dev server
- **Firebase** - Authentication and Firestore Database
- **Tailwind CSS** - CSS Framework
- **Lucide React** - Icons

## 🚀 Prerequisites

Before starting, make sure you have installed:

- **Node.js** (version 18 or higher)
- **npm** (usually included with Node.js)

To check installed versions:
```bash
node --version
npm --version
```

## 📦 Installation

1. **Clone the repository** (if you haven't already):
```bash
git clone <repository-url>
cd plannning_react_canvas/planning_scrum_poker
```

2. **Install dependencies**:
```bash
npm install
```

## 🔧 Configuration

The project is already configured with Firebase. The configuration is present in the `src/App.jsx` file and includes:

- Anonymous authentication
- Firestore Database for sessions
- Firebase Hosting (optional)

> **Note**: The project uses an already configured Firebase project. If you want to use your own Firebase project, modify the configuration in `src/App.jsx`.

## 🎯 Starting the Project

### Development Mode

To start the development server:

```bash
npm run dev
```

The application will be available at: **http://localhost:5173**

### Other Useful Commands

- **Build for production**:
```bash
npm run build
```

- **Preview build**:
```bash
npm run preview
```

- **Code linting**:
```bash
npm run lint
```

## 🎮 How to Use the Application

1. **Start the application** with `npm run dev`
2. **Enter a nickname** when prompted
3. **Create a new session** by clicking "Create New Session"
4. **Share the session link** with participants
5. **Vote** by selecting a card
6. **Reveal votes** when everyone has voted
7. **Start a new round** if needed

## 📁 Project Structure

```
planning_scrum_poker/
├── src/
│   ├── App.jsx          # Main component and Firebase logic
│   ├── App.css          # Global CSS styles
│   ├── main.jsx         # Application entry point
│   └── index.css        # Base styles and Tailwind imports
├── public/
│   └── spade-ace.svg    # App icon
├── package.json         # Dependencies and scripts
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind configuration
└── firebase.json        # Firebase Hosting configuration
```

## 🃏 Card Values

The application uses these values for the cards:
- **2, 4, 8, 20** - Numeric values for estimation
- **❓** - "I don't know" card
- **☕** - "Break" card

## 🌐 Deployment

The project is configured for deployment on Firebase Hosting:

1. **Install Firebase CLI**:
```bash
npm install -g firebase-tools
```

2. **Login**:
```bash
firebase login
```

3. **Build and deploy**:
```bash
npm run build
firebase deploy
```

## 🐛 Troubleshooting

### Common issues:

1. **Firebase connection error**: Check internet connection
2. **Port already in use**: Vite will automatically use a different port
3. **Build errors**: Run `npm install` to reinstall dependencies

### Debug:

- Open browser console (F12) to see any errors
- Check terminal console for build errors
- Verify all dependencies are installed correctly

## 📝 Development Notes

- The Firebase database is configured to work in real-time
- Authentication is anonymous and automatic
- Session data is temporary and maintained as long as there are active participants

## 🤝 Contributing

If you want to contribute to the project:

1. Fork the repository
2. Create a branch for your feature
3. Commit your changes
4. Open a Pull Request

---

**Happy Planning Poker! 🎯**
