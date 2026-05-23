import type { AuditEventType, FinancialAuditEvent } from "@/types/fintech";
import { getFintechStore } from "@/lib/fintech/fintech-store";

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export class FinancialAuditService {
  async record(input: {
    type: AuditEventType;
    actor: string;
    actorLabel?: string;
    actorRole?: "admin" | "unknown";
    action?: FinancialAuditEvent["action"];
    targetCollection: string;
    targetId?: string;
    resourceType?: string;
    resourceId?: string;
    ip?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }): Promise<FinancialAuditEvent> {
    const resourceType = input.resourceType ?? input.targetCollection;
    const resourceId = input.resourceId ?? input.targetId;

    return getFintechStore().createAuditEvent({
      id: createId("audit"),
      createdAt: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? "unknown",
      type: input.type,
      action: input.action ?? input.type,
      actor: input.actor,
      actorId: input.actor,
      actorLabel: input.actorLabel,
      actorRole: input.actorRole,
      targetCollection: input.targetCollection,
      targetId: input.targetId,
      resourceType,
      resourceId,
      ip: input.ip,
      userAgent: input.userAgent,
      metadata: input.metadata ?? {},
    });
  }
}
