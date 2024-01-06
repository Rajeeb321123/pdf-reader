// securing our page from unauthorized user

import { authMiddleware } from "@kinde-oss/kinde-auth-nextjs/server";

export const config = {
    matcher: ["/dashboard/:path", "/auth-callback"]

};

export default authMiddleware;