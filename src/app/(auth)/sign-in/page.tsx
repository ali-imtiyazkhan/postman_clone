"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { signIn } from "@/lib/auth-client";
import { Chrome, Github } from "lucide-react";
import Link from "next/link";
import React from "react";
import { BackgroundBeams } from "@/components/ui/background-beams";

const LoginPage = () => {
  return (
    <section className="relative min-h-screen overflow-hidden bg-black text-white px-4 py-16 md:py-32">
    
      <BackgroundBeams />

      <div className="relative z-10 m-auto w-full max-w-sm">
        <div className="bg-card/80 backdrop-blur-xl rounded-[calc(var(--radius)+.125rem)] border border-white/10 shadow-xl">
          <div className="p-8 pb-6">
            <div>
              <Link href="/">
                <h1 className="text-2xl font-bold">Postman</h1>
              </Link>

              <h1 className="mb-1 mt-4 text-xl font-semibold">
                Sign in to Postman
              </h1>

              <p className="text-sm text-neutral-400">
                Welcome back! Sign in to continue
              </p>
            </div>

            {/* GitHub */}
            <div className="mt-6 grid gap-3">
              <Button
                variant="outline"
                className="w-full bg-white/5 border-white/10 hover:bg-white/10"
                onClick={() =>
                  signIn.social({
                    provider: "github",
                    callbackURL: "/",
                  })
                }
              >
                <Github className="mr-2 h-4 w-4" />
                Sign in with GitHub
              </Button>
            </div>

            {/* Google */}
            <div className="mt-3 grid gap-3">
              <Button
                variant="outline"
                className="w-full bg-white/5 border-white/10 hover:bg-white/10"
                onClick={() =>
                  signIn.social({
                    provider: "google",
                    callbackURL: "/",
                  })
                }
              >
                <Chrome className="mr-2 h-4 w-4" />
                Sign in with Google
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LoginPage;
