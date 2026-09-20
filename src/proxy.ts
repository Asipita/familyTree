import { auth } from "@/lib/auth/server";

export default auth.middleware({ loginUrl: "/auth/sign-in" });

export const config = {
  matcher: [
    "/tree/:path*",
    "/stories/:path*",
    "/people/:path*",
    "/reviews/:path*",
    "/connections/:path*",
    "/invitations/:path*",
    "/settings/:path*",
    "/setup/:path*",
    "/onboarding/:path*",
  ],
};
