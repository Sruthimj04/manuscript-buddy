# Manuscript Mastery

Build a production-ready, highly responsive Frontend Application for a "Book Submission & AI-Assisted Publishing System" based on the following comprehensive specifications.

=========================================

1. ARCHITECTURE & TECH STACK

=========================================

- Framework: React (Vite), Tailwind CSS, Lucide React Icons, shadcn/ui.

- Backend Status: Independent Frontend Mock Mode. All data must persist in client state (e.g. React Context / Zustand) during the active session. Abstract all data operations into mock service files (e.g., `services/manuscriptService.ts`) to allow seamless backend REST API hookups later.

- Design System: Monochrome & High Contrast. Font family 'Inter', 4/8px spacing grid, crisp borders, dark/light contrast badges, subtle micro-interactions, explicit loading spinners, empty states, and error handling.

=========================================

2. CORE USER ROLES & NAVIGATION

=========================================

- Role Switcher / Dev Control Bar: Include an persistent, sleek Admin/Dev Banner at the top of the viewport to instantly toggle between "Author View", "Editor View", and "Admin View" for testing state changes.

- Navigation Header: Brand logo ("PubFlow ERP"), Active User Profile ("Amara - Author"), active role badge, and navigation tabs (Dashboard, New Submission, AI Analytics, Settings).

=========================================

3. PAGE SPECIFICATIONS & WORKFLOW

=========================================

--- PAGE 1: AUTHENTICATION (Login) ---

- Clean Login Card with Email, Password, and Role Selector (Author, Editor, Admin).

- Form validation (e.g., email format check, empty password alert).

- Successful login redirects directly to the Author Landing Dashboard.

--- PAGE 2: AUTHOR LANDING DASHBOARD (Always-On Progress Overview) ---

- Hero Header: Quick overview of overall manuscript stats (Total Submitted, Under Review, Action Required, Published).

- Live Pipeline Status Card: A prominent visual progress tracker for the active manuscript displaying step progression:

  [ 1. Draft -> 2. AI Processing -> 3. Pending Editor Review -> 4. Revisions Requested -> 5. Approved -> 6. Published ]

- Interactive Manuscript List Table:

  - Columns: Manuscript Title, Submission Date, Current State Badge, Assigned Editor, AI Score, Actions.

  - Empty State: "No submissions found. Click 'Submit New Manuscript' to begin."

  - Action Buttons: "View Details", "Continue Draft", "Upload Revisions".

--- PAGE 3: MULTI-STEP SUBMISSION WIZARD (5 Steps) ---

Provide a clean step-by-step progress indicator at the top of the wizard.

Step 1 (Title & Category):

- Fields: Manuscript Title (text input with character counter), Primary Genre (dropdown), Secondary Genre, Target Audience (select menu), Keywords (tag input).

Step 2 (Description & Overview):

- Fields: Executive Abstract (textarea with word count), Detailed Synopsis (textarea), Estimated Page Count, Target Launch Date.

Step 3 (PDF Manuscript Upload):

- Drag & Drop Dropzone for .pdf files.

- File Validation: Accepts only .pdf, size limit < 50MB.

- Visual Progress Indicator: Simulates upload progress bar (0% -> 100%).

- Error state trigger for invalid file formats.

Step 4 (Interactive Preview & AI Scan):

- Split View Layout:

  - Left Pane: Embedded PDF Viewer mock frame / preview window with page controls.

  - Right Pane: AI Pre-flight Report summary showing extracted metadata (Title matched, Page count detected, Readability score badge).

Step 5 (Submission Confirmation):

- Full summary card listing all input data from Steps 1-4.

- Checkbox requirement: "I confirm this is my original work."

- Modal Dialog on "Submit Manuscript" action confirming submission.

--- PAGE 4: DETAILED MANUSCRIPT & AI REPORT VIEW ---

- Top Bar: Title, ID, Status Badge, Submission Timestamp, Download PDF button.

- Tabbed Navigation:

  - Tab A [AI Analysis Report]: Displays AI genre confidence breakdown bars (e.g. Fiction 75%, Drama 25%), readability score gauge, marketability index, pacing analysis, and AI-generated executive summary notes.

  - Tab B [Workflow Timeline]: Step-by-step audit log showing who changed what status and when (e.g. "AI Processing Completed @ 10:14 AM", "Editor Requested Revisions @ 11:30 AM").

  - Tab C [Editor Feedback & Revisions]: Displays notes left by the Editor. If status is "Revisions Requested", display a clear upload box for the author to submit updated PDF drafts.

--- PAGE 5: EDITOR & ADMIN PANELS ---

- Editor Review Workspace:

  - Table of pending manuscripts.

  - Decision Modal with radio options: "Approve Manuscript", "Request Revisions" (with mandatory feedback text box), or "Reject Manuscript" (with mandatory rejection reason dropdown & text area).

- Admin Dashboard:

  - Global overview table of all pipeline submissions.

  - Actions: Assign/reassign editors, force-advance workflow state, and a primary "Publish Final" button for approved manuscripts.

=========================================

4. MOCK DATA & INITIAL STATE

=========================================

Pre-populate the system with 2 sample manuscripts:

1. "The Quantum Paradigm" - State: "Pending Editor Review" - AI Score: 88% - Detailed AI Report ready.

2. "Echoes of Tomorrow" - State: "Revisions Requested" - Includes sample editor revision notes.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://manuscript-buddy.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/15caa7bf-e921-4b3e-ac0a-d9975598f899).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
