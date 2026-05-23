import type {
  FinancialAuditEvent,
  FinancingQuote,
  FinancingSimulation,
} from "@/types/fintech";

type FintechStoreState = {
  simulations: FinancingSimulation[];
  quotes: FinancingQuote[];
  auditEvents: FinancialAuditEvent[];
};

type CollectionName =
  | "financing_simulations"
  | "financing_quotes"
  | "admin_financial_audit_events";

declare global {
  var __aviFintechStoreState: FintechStoreState | undefined;
}

const state =
  globalThis.__aviFintechStoreState ??
  (globalThis.__aviFintechStoreState = {
    simulations: [],
    quotes: [],
    auditEvents: [],
  });

let fallbackWarningLogged = false;

function hasFirebaseAdminEnv() {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );
}

function assertLocalFallbackAllowed() {
  if (hasFirebaseAdminEnv()) {
    return;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Firebase Admin configuration is required for fintech financial storage in production. In-memory fallback is disabled.",
    );
  }

  if (!fallbackWarningLogged && process.env.NODE_ENV !== "test") {
    console.warn(
      "AVI fintech store is using process-local fallback storage. This is allowed only for development and tests.",
    );
    fallbackWarningLogged = true;
  }
}

async function getCollection(name: CollectionName) {
  if (!hasFirebaseAdminEnv()) {
    assertLocalFallbackAllowed();
    return null;
  }

  const { getAdminFirestore } = await import("@/lib/firebase/admin");

  return getAdminFirestore().collection(name);
}

export class FintechStore {
  async createSimulation(simulation: FinancingSimulation) {
    const collection = await getCollection("financing_simulations");

    if (collection) {
      await collection.doc(simulation.id).set(simulation);
    }

    state.simulations.unshift(simulation);

    return simulation;
  }

  async listSimulations() {
    const collection = await getCollection("financing_simulations");

    if (collection) {
      const snapshot = await collection.orderBy("createdAt", "desc").limit(100).get();

      return snapshot.docs.map((doc) => doc.data() as FinancingSimulation);
    }

    return state.simulations;
  }

  async getSimulation(id: string) {
    const collection = await getCollection("financing_simulations");

    if (collection) {
      const snapshot = await collection.doc(id).get();

      return snapshot.exists ? (snapshot.data() as FinancingSimulation) : null;
    }

    return state.simulations.find((simulation) => simulation.id === id) ?? null;
  }

  async createQuote(quote: FinancingQuote) {
    const collection = await getCollection("financing_quotes");

    if (collection) {
      await collection.doc(quote.id).set(quote);
    }

    state.quotes.unshift(quote);

    return quote;
  }

  async listQuotes() {
    const collection = await getCollection("financing_quotes");

    if (collection) {
      const snapshot = await collection.orderBy("createdAt", "desc").limit(100).get();

      return snapshot.docs.map((doc) => doc.data() as FinancingQuote);
    }

    return state.quotes;
  }

  async createAuditEvent(event: FinancialAuditEvent) {
    const collection = await getCollection("admin_financial_audit_events");

    if (collection) {
      await collection.doc(event.id).set(event);
    }

    state.auditEvents.unshift(event);

    return event;
  }

  async listAuditEvents() {
    const collection = await getCollection("admin_financial_audit_events");

    if (collection) {
      const snapshot = await collection.orderBy("createdAt", "desc").limit(200).get();

      return snapshot.docs.map((doc) => doc.data() as FinancialAuditEvent);
    }

    return state.auditEvents;
  }
}

const fintechStore = new FintechStore();

export function getFintechStore() {
  return fintechStore;
}
