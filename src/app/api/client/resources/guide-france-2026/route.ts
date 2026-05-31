import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore, getAdminStorage } from "@/lib/firebase/admin";
import { GUIDE_FRANCE_2026_STORAGE_PATH } from "@/lib/resources/guide-resource";

const downloadFilename = "AVI_CERTIFY_Guide_2026_Installation_France.pdf";

async function requireVerifiedClient(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";

  if (!token) {
    throw new Error("Unauthorized");
  }

  const decoded = await getAdminAuth().verifyIdToken(token, true);

  if (!decoded.email_verified) {
    const error = new Error("Email not verified");
    error.name = "Forbidden";
    throw error;
  }

  return decoded;
}

async function logGuideDownload(
  uid: string,
  email: string | undefined,
  userAgent: string | null,
) {
  await getAdminFirestore()
    .collection("users")
    .doc(uid)
    .collection("resource_downloads")
    .doc("guide_france_2026")
    .set(
      {
        uid,
        email: email ?? null,
        resourceId: "guide_france_2026",
        downloadedAt: FieldValue.serverTimestamp(),
        userAgent,
      },
      { merge: true },
    );
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireVerifiedClient(request);
    const file = getAdminStorage().bucket().file(GUIDE_FRANCE_2026_STORAGE_PATH);
    const [exists] = await file.exists();

    if (!exists) {
      return NextResponse.json({ error: "Guide not found." }, { status: 404 });
    }

    const [buffer] = await file.download();

    try {
      await logGuideDownload(user.uid, user.email, request.headers.get("user-agent"));
    } catch (error) {
        console.warn("[resources/guide-france-2026] Download log failed.", error);
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${downloadFilename}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "Forbidden") {
      return NextResponse.json({ error: "Email not verified." }, { status: 403 });
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
