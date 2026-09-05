# Elevate Autocoach

Elevate is an interactive prototype for automated driver coaching. It demonstrates how a fleet safety system can detect risky behaviour, automatically assign and track coaching, and surface only the exceptions that need a manager’s attention.

## What the prototype includes

- Automation Centre with weekly coaching results and AI-ranked attention items
- Automated and manual coaching session records
- Driver and group-level safety views
- Coaching analytics and weekly behaviour trends
- Training content library
- Automation mode and coaching cadence settings
- Driver-facing training and coaching previews

## Run locally

No build step is required. Serve the `dist` directory with any static web server. For example:

```bash
python3 -m http.server 4173 --directory dist
```

Then open `http://localhost:4173`.

## Repository structure

```text
.openai/hosting.json   ChatGPT Sites project configuration
dist/index.html        Application markup
dist/styles.css        Visual styling
dist/app.js            Mock data and interactions
```

## Status

This repository contains a front-end product prototype with mock data. It is intended for product design, workflow validation, and demonstrations; it does not include a production backend or live fleet integrations.
