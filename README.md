# Task Simplifier

A simple full-stack application that uses OpenAI to turn a high-level project request into actionable tasks, milestones, priorities, effort estimates, dependencies, and suggested execution order.

## Features

- Enter a project/task description
- Generate subtasks, milestones, priorities, and dependencies
- Display a structured plan in the browser
- Built with React + Vite frontend and Express + OpenAI backend

## Setup

1. Copy `.env.example` to `.env`
2. Set `OPENAI_API_KEY`
3. Install packages:
   ```bash
   npm install
   ```
4. Start the project:
   ```bash
   npm run start
   ```

## Project structure

- `src/` — React frontend
- `server/` — Express backend and OpenAI integration
- `public/` — HTML entrypoint

## Notes

- This scaffold is ready for future features like Jira/Trello/Asana export, team collaboration, timeline tracking, and task refinement.
- To switch from OpenAI to Google Gemini, replace the backend `server/openai.ts` logic with the Gemini REST client and update the prompt handling.
