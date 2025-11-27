import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/clerk-react";
import { Link } from "react-router-dom";

export const LandingPage = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-4xl font-bold">Lighting VTT</h1>
      <p className="text-lg">The blazingly fast lighting system for your tabletop games.</p>
      <SignedOut>
        <SignInButton mode="modal" forceRedirectUrl={"/library"}>
          <Button>Sign in</Button>
        </SignInButton>
        <SignUpButton mode="modal" forceRedirectUrl={"/library"}>
          <Button>Sign up</Button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        <Button asChild>
          <Link to="/library">Go to your Library</Link>
        </Button>
      </SignedIn>
      <Button asChild>
        <Link to="/scene">Get Started</Link>
      </Button>
    </div>
  );
};
