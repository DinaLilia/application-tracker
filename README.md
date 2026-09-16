# Application Tracker

Application Tracker is a small web application for managing job applications
in one place. It keeps track of the company, position, location, field,
application status, source, job description, link, follow-up dates, and notes.
The dashboard makes it easier to see the current state of each application and
keep follow-ups from being forgotten.

## How it works

The project has two parts:

- The Express server serves the frontend files and exposes a REST API under
  `/api/candidatures`.
- The frontend is a single-page interface served from the `public` directory.
  It uses `fetch` to read and update applications through the API.

Applications are stored in a local `data.json` file. The file is created
automatically with an empty list when the server starts for the first time.
This keeps the project simple and means that the data remains available after
closing the browser. The file is ignored by Git so personal application data
is not included when the project is published.

## Project structure

```text
application-tracker/
├── package.json       Project metadata, dependencies, and npm scripts
├── package-lock.json  Locked dependency versions
├── server.js          Express server and API routes
├── db.js              JSON file persistence layer
├── .gitignore         Files that should not be committed
└── public/
    ├── index.html     Main page structure
    ├── style.css      Application styles
    └── app.js         Frontend logic and API requests
```

## Requirements

- [Node.js](https://nodejs.org/) 18 or newer
- npm, which is included with Node.js

## Installation

Clone the repository and install its dependencies:

```bash
git clone <repository-url>
cd application-tracker
npm install
```

## Running the application

Start the development server with:

```bash
npm start
```

Then open [http://localhost:3000](http://localhost:3000) in a browser.

The server uses port 3000 by default. A different port can be provided through
the `PORT` environment variable.

```bash
PORT=4000 npm start
```

On Windows PowerShell, use:

```powershell
$env:PORT = 4000
npm start
```

Press `Ctrl+C` in the terminal to stop the server.

## API

The server provides the following endpoints:

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/candidatures` | Return all applications |
| GET | `/api/candidatures/:id` | Return one application |
| POST | `/api/candidatures` | Create an application |
| PUT | `/api/candidatures/:id` | Update an application |
| DELETE | `/api/candidatures/:id` | Delete an application |

The `entreprise` and `titre` fields are required when creating or updating an
application. The remaining fields are stored with the application data sent
by the client.

## Data and privacy

The local `data.json` file contains the applications stored by the server. It
is intentionally excluded from version control. Each person who clones the
project gets their own local data file, created automatically on first use.

To back up the data, copy `data.json` to a secure location. Do not commit it
to the repository if it contains personal information.

For a public deployment or multiple users, the JSON file should be replaced
with a persistent database and the application should include authentication
and appropriate access controls.
