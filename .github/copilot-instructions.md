# Copilot Instructions for Typing Race

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a classroom-focused typing competition service MVP built with Next.js and Socket.io.

## Key Requirements
- Support 20+ simultaneous participants in a classroom setting
- Real-time typing competition with live progress tracking
- Teacher dashboard for room management
- Student interface for joining and competing
- Simple PIN-based room system
- Japanese text support (hiragana, katakana, kanji)
- Cost-effective and simple architecture

## Technical Stack
- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes with Socket.io
- **Real-time**: Socket.io for WebSocket communication
- **Database**: File-based (SQLite or JSON) for MVP simplicity
- **Deployment**: Vercel (free tier)

## Core Features (MVP)
1. **Room Management**
   - Teacher creates room with 6-digit PIN
   - Students join via PIN
   - Real-time participant list

2. **Typing Competition**
   - Synchronized start for all participants
   - Live progress tracking (words per minute, accuracy)
   - Real-time leaderboard
   - Immediate results display

3. **User Interface**
   - Teacher dashboard: room control, participant monitoring
   - Student interface: typing area, progress display
   - Responsive design for various devices

## Code Style Guidelines
- Use TypeScript for type safety
- Implement proper error handling for WebSocket connections
- Keep components simple and focused
- Use Tailwind CSS for styling
- Follow Next.js App Router patterns
- Ensure accessibility for educational environments

## Performance Considerations
- Optimize for 20+ concurrent WebSocket connections
- Implement efficient real-time data synchronization
- Handle network interruptions gracefully
- Minimize bundle size for faster loading
