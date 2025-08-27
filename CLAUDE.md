# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React + TypeScript + Vite project using TailwindCSS for styling. It's a minimal setup currently containing a basic counter app with the default Vite React template.

Key technologies:
- **Frontend**: React 19, TypeScript
- **Build Tool**: Vite 7
- **Styling**: TailwindCSS 4
- **Linting**: ESLint with TypeScript support

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production (runs TypeScript check first)
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Architecture

The project follows standard Vite React structure:
- `src/main.tsx` - Application entry point with React root rendering
- `src/App.tsx` - Main application component
- `src/assets/` - Static assets like SVG files
- `public/` - Public static files, includes extensive flag SVG collection
- `public/flags/` - Country/region flag SVG files (200+ flags)

## Key Configuration

- Uses Vite with React plugin and TailwindCSS plugin
- TypeScript configuration split between `tsconfig.app.json` and `tsconfig.node.json`
- ESLint configured with React hooks and React refresh plugins
- TailwindCSS v4 integrated via Vite plugin

## Notes

- The project includes an extensive collection of country/regional flag SVGs in `public/flags/`
- Currently uses the basic Vite React template structure
- TailwindCSS classes are already being used in components (e.g., `bg-blue-500` in App.tsx)