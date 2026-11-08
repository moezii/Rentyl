# Changelog

All notable changes to this project are documented in this file. The format
is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
project follows [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-11-08

First public release.

### Added

- Companies, users, cars, clients, rentals and maintenance records, all scoped to a company.
- Car images, registration and insurance expiry, mileage and oil-change reminders.
- Client licence and ID uploads, served through short-lived signed URLs.
- Rental days and prices calculated by database triggers from daily, weekly and monthly rates.
- PDF rental receipts and net income statements in English and Arabic.
- Revenue, utilization and maintenance-cost analytics per car and per fleet.
- Calendar of rental ends and document expiry dates.
- Public booking flow with document upload and AMWAL payment.
- Prices rounded to the currency's precision (3 decimals for OMR, KWD and BHD).
- Blocking database, PDF and email work runs in a thread pool instead of on the event loop.
- Single Docker image: Nginx serves the frontend, proxies the backend and answers with a JSON 503 while the backend is starting.

### Security

- A booking is only created for a server-signed payment token, issued after the AMWAL response hash has been verified; the amount must match the server-computed price.
- An exclusion constraint on `rentalrecords` rejects overlapping rentals of the same car.
- The backend uses the Supabase service role and enforces company isolation in code; the `anon` role has no table access.
- Management endpoints require authentication and are limited to the caller's company; user and company administration is admin only.
- Refresh tokens stop working after logout or session revocation, and the token blacklist fails closed.
- Public IDs use AES-256-GCM; IDs in the old AES-CBC format are still accepted.
- Uploads are checked for type and size and stored under server-generated names.
- Login, booking, upload and payment endpoints are rate limited per client IP, and forwarding headers are only trusted from configured proxies.
- Email content is HTML-escaped and error responses no longer include internal details.

[1.0.0]: https://github.com/moezii/Rentyl/releases/tag/v1.0.0
