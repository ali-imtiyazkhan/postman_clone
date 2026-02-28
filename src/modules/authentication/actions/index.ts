"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const currentUser = async () => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    return session?.user ?? null;
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
};
