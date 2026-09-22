"use client";

import { useEffect, useState } from "react";

function greetingWord(hour: number) {
  if (hour < 5) return "Boa noite";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default function GreetingHeading({ firstName }: { firstName: string }) {
  // Starts with a neutral word so server and client markup match on first paint,
  // then swaps to the real local-time greeting once mounted in the browser.
  const [word, setWord] = useState("Olá");

  useEffect(() => {
    setWord(greetingWord(new Date().getHours()));
  }, []);

  return (
    <h1 className="mt-2 text-3xl font-extrabold tracking-[-.045em] sm:text-4xl">{word}, {firstName}! 👋</h1>
  );
}
