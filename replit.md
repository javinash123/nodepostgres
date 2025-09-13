# IT Company Project Management Tool

## Project Overview
A comprehensive project management web application designed specifically for IT companies to manage clients, projects, and project data with mobile-responsive design.

## User Requirements
- Project management tool for IT company
- Client and project management
- Specific project fields: name, client, website URL, Android/iOS app URLs, dates, budget, client source
- Project credentials text field
- File upload functionality
- Project extensions/add-ons management (new end dates, extended budgets, actual completion dates)
- Mobile-friendly responsive design
- Admin login with predefined credentials
- Deployable to user's server

## Technology Stack
- **Frontend**: React with TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Node.js with Express
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based admin login
- **File Handling**: Local file storage with upload capability
- **Mobile**: Responsive web design

## Architecture Decisions
- Single full-stack JavaScript application for easy deployment
- Mobile-first responsive design approach
- Admin-only access with predefined credentials
- Comprehensive project data model with extension capabilities
- File upload and storage system

## Recent Changes
- Initial project setup started (2025-01-28)
- Successfully imported from GitHub and configured for Replit environment (2025-09-13)
- PostgreSQL database created and schema deployed
- Application running on port 5000 with proper Replit proxy configuration
- **Critical Fix Applied (2025-09-13)**: Resolved salary unit mismatch causing 12x cost miscalculation in performance reports
- Enhanced employee form with financial year-based salary management and complete salary history
- Fixed backend cost calculation to accurately handle monthly-to-annual salary conversion

## User Preferences
- Prefers deployment flexibility to own server
- Needs mobile-friendly interface
- Requires comprehensive project management features
- Wants file upload capability