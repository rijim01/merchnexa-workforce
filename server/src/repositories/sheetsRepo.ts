import { getSheetsClient } from "../config/sheets.js";
import { config } from "../config/env.js";

export class SheetsRepository {
  private spreadsheetId = config.google.spreadsheetId;

  /**
   * Append a row to a designated sheet tab
   */
  async appendRow(sheetName: string, rowData: any[]): Promise<boolean> {
    const sheets = getSheetsClient();
    if (!sheets || !this.spreadsheetId) {
      console.log(`[Mock Sheets] Appended to ${sheetName}:`, rowData);
      return true;
    }

    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:Z`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [rowData],
        },
      });
      return true;
    } catch (error) {
      console.error(`Failed to append row to Google Sheet (${sheetName}):`, error);
      throw new Error(`Google Sheets operation failed for ${sheetName}`);
    }
  }

  /**
   * Read all rows from a designated sheet tab
   */
  async readRows(sheetName: string): Promise<any[][]> {
    const sheets = getSheetsClient();
    if (!sheets || !this.spreadsheetId) {
      return [];
    }

    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:Z`,
      });
      return response.data.values || [];
    } catch (error) {
      console.error(`Failed to read rows from Google Sheet (${sheetName}):`, error);
      return [];
    }
  }
}

export const sheetsRepo = new SheetsRepository();
