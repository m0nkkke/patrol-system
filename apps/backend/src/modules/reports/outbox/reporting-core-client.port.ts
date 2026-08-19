export const REPORTING_CORE_CLIENT = Symbol('REPORTING_CORE_CLIENT');

export interface ReportingCoreClientPort {
  publish(event: {
    eventId: string;
    eventType: string;
    payload: Record<string, unknown>;
  }): Promise<void>;
}
