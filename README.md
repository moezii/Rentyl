# Rentyl

Rentyl is a car-rental platform for several rental companies at once. Each
company manages its own fleet, clients, rentals, maintenance and reports, and
customers can book and pay for a car online. The interface is available in
English and Arabic.

The backend is FastAPI on top of Supabase (PostgreSQL and Storage), the
frontend is React with Vite, payments go through AMWAL, and production runs
as a single Docker image with Nginx in front of the API.

## Features

- Fleet management with car images, registration and insurance expiry, mileage and oil-change reminders
- Clients with licence and ID documents (private storage, short-lived signed URLs)
- Rentals priced from daily, weekly and monthly rates, with PDF receipts
- Maintenance records, a calendar of rental ends and expiry dates, and per-car and per-fleet analytics
- Public booking pages with document upload and card payment
- Data separated per company; the backend filters every company query on the signed-in user's company

## Setup

You need Python 3.11, Node.js and a Supabase project that already has the
Rentyl schema. The files in `backend/migrations/` are incremental and apply on
top of that schema; export it from an existing project with
`supabase db dump --schema-only`.

Copy the example environment files and fill them in:

    cp .env.example .env
    cp frontend/.env.example frontend/.env

Each variable is described in the example files. Then start the backend from
the repository root:

    pip install -r backend/requirements-dev.txt
    uvicorn backend.main:app --reload

The API listens on port 8000 and serves its OpenAPI reference at `/docs`.

Start the frontend:

    cd frontend
    npm ci --legacy-peer-deps
    npm start

To run both in one container instead, use `docker compose up --build` and open
http://localhost:10000. `VITE_*` values are build arguments there, since Vite
embeds them in the bundle.

## Running tests

    pytest backend
    cd frontend && npx vitest run

The backend tests use an in-memory fake instead of Supabase and need no network.

## Documentation

- [Payments](docs/payments.md)
- [Database triggers and views](docs/database/views-and-triggers.md)
- [Translations](frontend/src/translations/README.md)
- [Changelog](CHANGELOG.md)

## Authors

Rentyl was originally built by a small team at Rentyl; this repository is a
cleaned-up showcase version.
