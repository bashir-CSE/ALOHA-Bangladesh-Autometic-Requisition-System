# ALOHA Bangladesh - Automatic Requisition System

**GitHub Repository:** [https://github.com/bashir-CSE/ALOHA-Bangladesh-Autometic-Requisition-System](https://github.com/bashir-CSE/ALOHA-Bangladesh-Autometic-Requisition-System)

This project is a web-based automatic requisition system for ALOHA Bangladesh, designed to streamline the process of requesting classroom supplies. It's built using Google Apps Script and a web front-end, allowing branches to submit requisitions easily. The system automatically generates a PDF of the requisition, saves it to a designated Google Drive folder, and logs the details in a Google Sheet.

## Features

- **Web-based Interface:** An intuitive and user-friendly web form for creating and submitting requisitions.
- **Dynamic Data Loading:** Branch names and item lists are dynamically fetched from a Google Sheet, ensuring the data is always up-to-date.
- **Automatic PDF Generation:** Upon submission, a professional-looking PDF of the requisition slip is automatically generated.
- **Google Drive Integration:** The generated PDF is saved to a specific folder in Google Drive for easy access and record-keeping.
- **Google Sheets Logging:** All requisition details, including a link to the generated PDF, are logged in a Google Sheet for tracking and auditing purposes.
- **Unique Requisition ID:** Each requisition is assigned a unique ID for easy identification.
- **Responsive Design:** The web interface is designed to be responsive and works on various devices.

## Setup and Deployment

To use this system, you need to:

1.  **Create a Google Sheet:**
    *   Create a new Google Sheet with the following sheets:
        *   `Sheet1`: To store the raw requisition data.
        *   `Sheet2`: To log the requisition details and PDF links.
        *   `Sheet3`: To store the list of branches, branch codes, and items.
    *   Update the `spreadsheetId` in the `Code.gs` file with the ID of your Google Sheet.

2.  **Create a Google Drive Folder:**
    *   Create a folder in Google Drive where the generated PDFs will be stored.
    *   Update the `folderId` in the `Code.gs` file with the ID of your Google Drive folder.

3.  **Deploy as a Web App:**
    *   Open the Google Apps Script editor.
    *   Go to `Deploy` > `New deployment`.
    *   Select `Web app` as the deployment type.
    *   Configure the web app settings, ensuring that it is accessible to the intended users.
    *   Deploy the web app. You will get a URL that you can share with the users.

## Usage

1.  Open the web app URL in a browser.
2.  Fill out the requisition form.
3.  Click "Save & Download PDF".
4.  The requisition will be processed, and a PDF will be downloaded to your device. The data will also be saved in the configured Google Sheet and Google Drive folder.
