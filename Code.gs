// =================================================================
// CONFIGURATION
// =================================================================
const CONFIG = {
  SPREADSHEET_ID: '10BHEHZrXtgIpfVqIJBLZvFGuavw2ge-Xr6GCDNycAs4',
  DATA_SHEET_NAME: 'Sheet1',
  LOG_SHEET_NAME: 'Sheet2',
  CONFIG_SHEET_NAME: 'Sheet3',
  PDF_FOLDER_ID: '1e8dgi8QcqC3JOfvg-krN6qyxDqnc92gj'
};

// =================================================================
// MAIN FUNCTIONS
// =================================================================

/**
 * Serves the HTML file for the web app.
 * @returns {HtmlOutput} The HTML output for the web app.
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index');
}

/**
 * Fetches branch and item data from the configuration sheet.
 * @returns {object} An object containing the branches and items.
 */
function getBranchAndItemData() {
  try {
    const sheet = getSheet(CONFIG.CONFIG_SHEET_NAME);
    if (!sheet) {
      throw new Error(`Sheet '${CONFIG.CONFIG_SHEET_NAME}' not found. Please create it with columns: Branch Name, Branch Code, Item Name.`);
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      throw new Error(`Sheet '${CONFIG.CONFIG_SHEET_NAME}' is empty or contains only headers.`);
    }

    const branches = [];
    const items = new Set();
    data.slice(1).forEach(row => { // Skip header row
      const branchName = row[0]?.toString().trim();
      const branchCode = row[1]?.toString().trim();
      const itemName = row[2]?.toString().trim();

      if (branchName && branchCode && !branches.some(b => b.name === branchName)) {
        branches.push({ name: branchName, code: branchCode });
      }
      if (itemName) {
        items.add(itemName);
      }
    });

    if (branches.length === 0) {
      throw new Error(`No valid branch data found in '${CONFIG.CONFIG_SHEET_NAME}'.`);
    }

    Logger.log('Fetched branches: ' + JSON.stringify(branches));
    Logger.log('Fetched items: ' + JSON.stringify(Array.from(items)));

    return {
      branches: branches,
      items: Array.from(items)
    };
  } catch (error) {
    Logger.log('Error in getBranchAndItemData: ' + error.toString());
    throw new Error('Failed to fetch branch/item data: ' + error.message);
  }
}

/**
 * Saves the requisition data, creates a PDF, and logs the details.
 * @param {Array} data The requisition data.
 * @param {string} branchName The name of the branch.
 * @param {string} branchCode The code of the branch.
 * @param {string} currentDate The current date.
 * @param {string} requisitionBy The name of the person making the requisition.
 * @returns {object} An object indicating the success or failure of the operation.
 */
function saveRequisition(data, branchName, branchCode, currentDate, requisitionBy) {
  try {
    Logger.log('Starting saveRequisition function...');

    const requisitionNo = generateRequisitionNo(branchCode);
    Logger.log('Generated Requisition Number: ' + requisitionNo);

    const dataSheet = getSheet(CONFIG.DATA_SHEET_NAME);
    if (!dataSheet) throw new Error(`Sheet '${CONFIG.DATA_SHEET_NAME}' not found.`);

    const rows = data.map(row => [
      requisitionNo, currentDate, branchName, branchCode,
      row.courseType, row.item, row.level, row.batchNo, row.quantity, row.remarks || '',
      requisitionBy
    ]);
    dataSheet.getRange(dataSheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    Logger.log(`Data saved to '${CONFIG.DATA_SHEET_NAME}'.`);

    const pdfBase64 = createPdf(data, branchName, branchCode, requisitionNo, currentDate, requisitionBy);
    Logger.log('PDF generated successfully.');

    const folder = DriveApp.getFolderById(CONFIG.PDF_FOLDER_ID);
    if (!folder) throw new Error('Google Drive folder not found. Please check the folder ID in CONFIG.');
    Logger.log('Folder accessed successfully: ' + folder.getName());

    const fileName = `Requisition_${requisitionNo}.pdf`;
    const fileBlob = Utilities.newBlob(Utilities.base64Decode(pdfBase64), 'application/pdf', fileName);
    const file = folder.createFile(fileBlob);
    Logger.log('PDF uploaded to Google Drive: ' + file.getName());

    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const fileUrl = file.getUrl();
    Logger.log('Shareable link: ' + fileUrl);

    const logSheet = getSheet(CONFIG.LOG_SHEET_NAME);
    if (!logSheet) throw new Error(`Sheet '${CONFIG.LOG_SHEET_NAME}' not found.`);

    logSheet.appendRow([currentDate, requisitionNo, branchName, branchCode, fileUrl, requisitionBy]);
    Logger.log(`Details logged in '${CONFIG.LOG_SHEET_NAME}'.`);

    return {
      success: true,
      pdfBase64: pdfBase64,
      message: 'Requisition saved and PDF uploaded successfully!'
    };
  } catch (error) {
    Logger.log('Error in saveRequisition: ' + error.toString());
    return {
      success: false,
      message: 'Failed to process the requisition. Please try again. Error: ' + error.message
    };
  }
}

// =================================================================
// HELPER FUNCTIONS
// =================================================================

/**
 * Generates a unique requisition number.
 * @param {string} branchCode The code of the branch.
 * @returns {string} The generated requisition number.
 */
function generateRequisitionNo(branchCode) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  const props = PropertiesService.getScriptProperties();
  let lastId = parseInt(props.getProperty('lastRequisitionId') || '0') + 1;
  props.setProperty('lastRequisitionId', lastId);
  lock.releaseLock();
  return `RALH-${branchCode}-${String(lastId).padStart(8, '0')}`;
}

/**
 * Creates a PDF from the requisition data.
 * @param {Array} data The requisition data.
 * @param {string} branchName The name of the branch.
 * @param {string} branchCode The code of the branch.
 * @param {string} requisitionNo The requisition number.
 * @param {string} currentDate The current date.
 * @param {string} requisitionBy The name of the person making the requisition.
 * @returns {string} The base64 encoded PDF.
 */
function createPdf(data, branchName, branchCode, requisitionNo, currentDate, requisitionBy) {
  const htmlTemplate = `
        <html>
        <head>
            <style>
                @page { size: A4 landscape; margin: 25mm 10mm 0mm 10mm ; }
                body { font-family: Arial, sans-serif; margin: 0; padding: 0; text-align: center; position: relative; box-sizing: border-box; }
                table { width: 100%; border-collapse: collapse; margin: 15px auto; table-layout: fixed; }
                th, td { border: 1px solid #000; padding: 4px; text-align: center; word-wrap: break-word; font-size: 13px;}
                th { background-color: white; font-weight: bold; font-size: 14px;}
                .course-type-column { width: 10%; }
                .item-column { width: 20%; }
                .level-column { width: 10%; }
                .batch-no-column { width: 10%; }
                .quantity-column { width: 10%; }
                .remarks-column { width: 40%; }
                .due-details { position: absolute; top: 0mm; right: 4mm; text-align: right; font-size: 13px; }
                .branch-details { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
                .signature-section { position: absolute; bottom: 5mm; left: 10mm; right: 10mm; display: grid; grid-template-columns: repeat(5, 1fr); grid-row-gap: 0px; grid-column-gap: 60px;}
                .signature-section div { padding: 3px; text-align: center; }
                .signature-line { padding: 8px 8px 30px 8px; border-bottom: 1px solid #000; }
                .signature-name { padding: 8px; font-weight: bold; }
                .requisition-no { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
                .current-date { position: absolute; top: 0mm; left: 4mm; font-size: 14px; text-align: left; }
            </style>
        </head>
        <body>
            <div class="current-date">Date: ${currentDate}</div>
            <h2 style="margin-bottom: 5;">ALOHA Bangladesh</h2>
            <h3 style="margin: 5px 0px; font-size: 14px;font-weight: normal;">Class Room Supplies Requisition Slip</h3>
            <div class="requisition-no" style="font-size: 12px; font-weight: normal;">Requisition ID: ${requisitionNo}</div>
            <div class="branch-details">
                <div><strong>Branch Name:</strong> ${branchName}</div>
                <div><strong>Branch Code:</strong> ${branchCode}</div>
            </div>
            <div class="due-details">
                <p>Previous Due Tk: .........................</p>
                <p>Over Due Tk: .........................</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th class="course-type-column">Course Type</th>
                        <th class="item-column">Item</th>
                        <th class="level-column">Level</th>
                        <th class="batch-no-column">Batch No</th>
                        <th class="quantity-column">Quantity</th>
                        <th class="remarks-column">Remarks</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(row => `
                        <tr>
                            <td class="course-type-column">${row.courseType}</td>
                            <td class="item-column">${row.item}</td>
                            <td class="level-column">${row.level}</td>
                            <td class="batch-no-column">${row.batchNo}</td>
                            <td class="quantity-column">${row.quantity}</td>
                            <td class="remarks-column">${row.remarks || ''}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="signature-section">
                <div style="padding: 0px; font-size: small; text-transform:capitalize;" class="signature-name">${requisitionBy}</div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div class="signature-line"></div>
                <div class="signature-line"></div>
                <div class="signature-line"></div>
                <div class="signature-line"></div>
                <div class="signature-line"></div>
                <div>Requisition By</div>
                <div>Checked By</div>
                <div>Authorized by</div>
                <div>Issued By</div>
                <div>Received by</div>
            </div>
        </body>
        </html>
    `;

  const blob = Utilities.newBlob(htmlTemplate, MimeType.HTML, 'temp.html').getAs('application/pdf');
  return Utilities.base64Encode(blob.getBytes());
}

/**
 * Gets a sheet by its name from the configured spreadsheet.
 * @param {string} sheetName The name of the sheet to get.
 * @returns {Sheet} The sheet object.
 */
function getSheet(sheetName) {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  return spreadsheet.getSheetByName(sheetName);
}
