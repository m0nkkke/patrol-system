import { Injectable } from '@nestjs/common';
import { FindAuditLogDto } from '@patrol/shared';
import { Workbook } from 'exceljs';

import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { AuditLogService } from '../audit-log.service';
import { AuditLogEntity } from '../entities/audit-log.entity';

type ExportFile = {
  buffer: Buffer;
  contentType: string;
  filename: string;
};

type ExportRow = Record<string, string | number | null>;

@Injectable()
export class AuditLogExportService {
  constructor(private readonly auditLogService: AuditLogService) {}

  async exportCsv(query: FindAuditLogDto, actor: AuthenticatedUser): Promise<ExportFile> {
    const rows = (await this.auditLogService.findForExport(query, actor)).map(flattenAuditLog);

    return {
      buffer: Buffer.from(toCsv(rows), 'utf8'),
      contentType: 'text/csv; charset=utf-8',
      filename: 'audit-log.csv',
    };
  }

  async exportXlsx(query: FindAuditLogDto, actor: AuthenticatedUser): Promise<ExportFile> {
    const rows = (await this.auditLogService.findForExport(query, actor)).map(flattenAuditLog);

    return {
      buffer: await toXlsx('Audit Log', rows),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: 'audit-log.xlsx',
    };
  }
}

function flattenAuditLog(auditLog: AuditLogEntity): ExportRow {
  return {
    action: auditLog.action,
    createdAt: auditLog.createdAt.toISOString(),
    deviceId: auditLog.deviceId ?? null,
    entityId: auditLog.entityId ?? null,
    entityType: auditLog.entityType ?? null,
    id: auditLog.id,
    ipAddress: auditLog.ipAddress ?? null,
    meta: auditLog.meta === null || auditLog.meta === undefined ? null : JSON.stringify(auditLog.meta),
    userFullName: auditLog.user?.fullName ?? null,
    userId: auditLog.userId ?? null,
    userRole: auditLog.user?.role ?? null,
    username: auditLog.user?.username ?? null,
  };
}

function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) {
    return '';
  }

  const headers = Object.keys(rows[0] ?? {});
  return [
    headers.map(escapeCsvValue).join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(',')),
  ].join('\n');
}

function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function toXlsx(sheetName: string, rows: ExportRow[]): Promise<Buffer> {
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  const headers = Object.keys(rows[0] ?? {});
  worksheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: Math.max(header.length + 2, 16),
  }));

  for (const row of rows) {
    worksheet.addRow(row);
  }

  worksheet.getRow(1).font = { bold: true };
  const buffer = await workbook.xlsx.writeBuffer();

  return Buffer.from(buffer);
}
