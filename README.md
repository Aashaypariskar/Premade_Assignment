# Inspection Module – React

### Project Overview
This project is a React-based implementation of an audit inspection module. It allows users to go through different sections like Exterior and Lavatory to answer safety/maintenance questions. The main logic ensures that if a user selects "NO", they must provide mandatory audit details like reasons, remarks, and images before the answer is saved.

### Key Features
- Dynamic section-based layout (Exterior, Lavatory, etc.).
- Three-way selection: YES, NO, and N/A.
- Mandatory reason selection for all NO answers.
- Fields for optional remarks and image attachments.
- Interactive validation with inline error messages.
- Simulated API submission for testing the flow.

### Project Structure
- `App.js` – Main entry point.
- `InspectionPage.js` – Handles state, grouping, and submission logic.
- `QuestionItem.js` – Component for rendering individual questions.
- `NoReasonModal.js` – The audit flow triggered by a NO answer.
- `api.js` – Mock service for API communication.
- `data.js` – Static questions and configuration values.
- `index.css` – All styles for the module and modal.

### How the Logic Works
All answers are stored in a central object state using the question ID as a key. This makes updates very fast. Choosing "NO" immediately opens a modal, preventing the user from moving ahead without providing a reason. I've used standard React hooks like `useState` to manage the modal visibility and the accumulation of answer data. Validation is enforced at the modal level; the "Done" button won't proceed unless at least one reason is checked.

### API Handling
The `api.js` file uses a mock Promise with a 1-second delay. This is done to simulate a real-world network call, allowing the UI to show "Submitting..." states and success/error notifications as it would in a live environment.

### Image Handling
The project uses a standard file input in the modal. For this demo, I am capturing the file objects and storing their names in the state to prove the logic is correctly packaging the audit data.

### Performance & Scalability
The app is built to be data-driven. Adding new questions or sections to `data.js` will automatically update the UI. No code changes are needed in the components to scale the inspection list.

### How to Run the Project
1. Run `npm install` to download dependencies.
2. Run `npm start` to launch the development server.

### Notes / Assumptions
- A mock API is used to demonstrate the submission lifecycle.
- The focus is on frontend logic and validation correctness.
- The state structure is designed to be easily converted to a JSON payload for any REST API.

This project focuses on correctness, validation, and clean logic rather than heavy UI or over-engineering.
