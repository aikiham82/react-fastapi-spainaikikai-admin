import { apiClient } from '@/core/data/apiClient';
import type { ImportMembersRequest, ImportMembersResponse, ExportMembersFilters } from './import-export.schema';
import * as XLSX from 'xlsx';

const BASE_URL = '/api/v1/import-export';

export const importMembers = async (data: ImportMembersRequest): Promise<ImportMembersResponse> => {
  return await apiClient.post<ImportMembersResponse>(`${BASE_URL}/members`, data);
};

export const exportMembers = async (filters?: ExportMembersFilters): Promise<Blob> => {
  const response = await apiClient.get<Blob>(`${BASE_URL}/members/export`, {
    params: filters,
    responseType: 'blob',
  });

  return response;
};

export const parseExcelFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(data);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
};

export const exportToExcel = (data: any[], filename: string): void => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const importExportService = {
  importMembers,
  exportMembers,
  parseExcelFile,
  exportToExcel,
};
