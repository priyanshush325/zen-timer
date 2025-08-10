# Zen Timer

> A distraction-free, all-in-one speedcubing timer application built with Electron and React.

## Overview

Zen Timer is a modern speedcubing practice application designed to provide everything you need in one focused environment. No more switching between apps for music, statistics, or customization—practice with complete focus and intention.

### Key Features

- **🎯 Distraction-Free Environment** - Everything you need without leaving the app
- **🎵 Built-in Media Controls** - Integrated music and audio controls for your practice sessions
- **📊 Advanced Analytics** - Detailed statistics and progress tracking
- **⚙️ Deep Customization** - Personalize your practice environment
- **⚡ Precision Timing** - Accurate timing with spacebar controls
- **🎨 Modern Design** - Clean, minimalist interface built with Tailwind CSS

## Tech Stack

- **Framework**: [Electron](https://electronjs.org/) with [Electron Forge](https://www.electronforge.io/)
- **Frontend**: [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Package Manager**: [pnpm](https://pnpm.io/)
- **Fonts**: [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) + [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono)

## Getting Started

### Prerequisites

- **Node.js** (v16 or higher)
- **pnpm** (recommended) or npm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/zen-timer.git
   cd zen-timer
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start development server**
   ```bash
   pnpm start
   ```

## Project Structure

```
zen-timer/
├── src/
│   ├── components/          # React components
│   │   ├── StartupScreen.tsx
│   │   └── ...
│   ├── assets/             # Icons and static assets
│   ├── main.ts             # Electron main process
│   ├── preload.ts          # Electron preload script
│   ├── renderer.tsx        # React app entry point
│   └── index.css           # Global styles and Tailwind
├── assets/                 # App icons and resources
├── forge.config.ts         # Electron Forge configuration
├── vite.*.config.ts        # Vite build configurations
└── package.json
```

## Contributing

⚠️ **Important**: All contributions must be made against the `dev` branch. Pull requests directly to `main` will be rejected by default.

### Branch Workflow

- **`main`**: Production-ready code, stable releases only
- **`dev`**: Active development branch where all new features are integrated
- **Feature branches**: Branch from `dev` for individual features

### Development Workflow

1. **Fork the repository**
2. **Clone and switch to dev branch**
   ```bash
   git clone https://github.com/your-username/zen-timer.git
   cd zen-timer
   git checkout dev
   ```
3. **Create a feature branch from dev**
   ```bash
   git checkout -b feat/amazing-feature
   ```
4. **Make your changes** following the code style
5. **Commit using conventional commits** (see below)
6. **Push and create a Pull Request against the `dev` branch**

**🚨 Pull Request Requirements:**
- Target the `dev` branch (not `main`)
- Follow conventional commit format
- Include clear description of changes
- Ensure all tests pass

Once features in `dev` are validated and ready for release, they will be merged into `main`.

### Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/). Please format your commits as:

```
<type>[optional scope]: <description>
```

**Types:**
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat: add media controls to timer interface
fix: resolve timing accuracy on slower devices
docs: update installation instructions
style: improve button hover animations
```

### Code Style

- **TypeScript**: Strict typing encouraged
- **React**: Functional components with hooks
- **Styling**: Tailwind utility classes preferred
- **Formatting**: ESLint configuration provided

### Testing

```bash
# Run linting
pnpm run lint
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.