import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, getAdminAuth } from "@/lib/firebase/admin";

async function requireClientUid(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (!token) throw new Error("Unauthorized");
  const decoded = await getAdminAuth().verifyIdToken(token, true);
  return decoded.uid;
}

function clientDate(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().toISOString();
  }

  return typeof value === "string" ? value : null;
}

export async function GET(request: NextRequest) {
  let uid: string;

  try {
    uid = await requireClientUid(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await getAdminFirestore()
      .collection("documents")
      .where("ownerId", "==", uid)
      .limit(100)
      .get();

    return NextResponse.json({
      documents: snapshot.docs.map((doc) => {
        const data = doc.data();

        return {
          id: doc.id,
          documentType: data.documentType,
          status: data.status,
          originalFileName: data.originalFileName ?? data.safeFileName ?? null,
          contentType: data.contentType ?? null,
          size: typeof data.size === "number" ? data.size : null,
          caseId: typeof data.caseId === "string" ? data.caseId : null,
          adminComment:
            typeof data.adminComment === "string" ? data.adminComment : null,
          rejectionReason:
            typeof data.rejectionReason === "string"
              ? data.rejectionReason
              : null,
          requestedAt: clientDate(data.requestedAt),
          createdAt: clientDate(data.createdAt),
          updatedAt: clientDate(data.updatedAt),
          hasUploadedFile: Boolean(data.storagePath),
        };
      }),
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load client documents." },
      { status: 500 },
    );
  }
}
