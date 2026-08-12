"use client";

import { Manrope } from "next/font/google";
import { motion, useReducedMotion } from "framer-motion";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
});

const HERO_IMAGE =
  "https://aruyghvpjdiiuiesaupw.supabase.co/storage/v1/object/public/growcode-hero/growcode-bg.png";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const NAV_LINKS = [
  { label: "Solutions", href: "#solutions" },
  { label: "Work", href: "#work" },
  { label: "About", href: "#about" },
  { label: "Insights", href: "#insights" },
] as const;

function SparkleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 14 14"
      fill="none"
      className="h-[13px] w-[13px] shrink-0"
    >
      <path
        d="M7 0.75C7.18 4.61 9.39 6.82 13.25 7C9.39 7.18 7.18 9.39 7 13.25C6.82 9.39 4.61 7.18 0.75 7C4.61 6.82 6.82 4.61 7 0.75Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function GrowcodeLanding() {
  const prefersReducedMotion = useReducedMotion();

  const entrance = (
    delay: number,
    distance = 14,
    duration = 0.72,
  ) => ({
    initial: prefersReducedMotion
      ? false
      : {
          opacity: 0,
          y: distance,
        },
    animate: {
      opacity: 1,
      y: 0,
    },
    transition: {
      duration: prefersReducedMotion ? 0 : duration,
      delay: prefersReducedMotion ? 0 : delay,
      ease: EASE_OUT,
    },
  });

  return (
    <section
      className={`${manrope.className} min-h-dvh overflow-x-hidden bg-white font-medium tracking-[-0.06em] text-black`}
    >
      <motion.nav
        {...entrance(0, -10, 0.68)}
        aria-label="Primary navigation"
        className="fixed left-1/2 top-4 z-50 flex h-12 w-[calc(100%-2.5rem)] max-w-[46rem] -translate-x-1/2 items-center rounded-full bg-[#252525] pl-5 pr-1.5"
        style={{
          boxShadow:
            "inset 0 4px 10px 0 rgba(255, 255, 255, 0.1), 0 4px 20px 0 rgba(0, 0, 0, 0.3)",
        }}
      >
        <a
          href="#top"
          aria-label="Growcode home"
          className="flex shrink-0 items-center gap-2 text-[13.5px] leading-none text-white"
        >
          <SparkleIcon />
          <span>Growcode</span>
        </a>

        <div className="hidden flex-1 items-center justify-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[12.5px] leading-none text-white/50 transition-colors duration-300 hover:text-white focus-visible:text-white focus-visible:outline-none"
            >
              {link.label}
            </a>
          ))}
        </div>

        <a
          href="#get-started"
          className="ml-auto inline-flex shrink-0 items-center justify-center rounded-full bg-white px-5 py-2.5 text-[12.5px] leading-none text-black transition-colors duration-300 hover:bg-zinc-100 focus-visible:bg-zinc-100 focus-visible:outline-none"
        >
          Get started
        </a>
      </motion.nav>

      <main
        id="top"
        className="mx-5 min-h-dvh w-[calc(100%-2.5rem)] border-x border-black/10"
      >
        <div className="pt-[5.25rem] sm:pt-28">
          <motion.div
            {...entrance(0.08)}
            className="h-[500px] w-full overflow-hidden bg-white"
          >
            <img
              src={HERO_IMAGE}
              alt="Dithered landscape with a moon, mountain peak, and cypress silhouettes"
              draggable={false}
              decoding="async"
              fetchPriority="high"
              className="h-full w-full select-none object-cover object-center"
            />
          </motion.div>
        </div>

        <div className="grid items-start gap-9 px-4 pb-14 pt-10 sm:pb-16 sm:pt-12 lg:grid-cols-[1.4fr_0.85fr] lg:gap-16 lg:px-8">
          <motion.h1
            {...entrance(0.16)}
            className="text-[36px] leading-[1.06] sm:text-[44px] lg:text-[58px]"
          >
            <span className="block">Elevate your brand.</span>
            <span className="block">Dominate your market.</span>
          </motion.h1>

          <motion.div
            {...entrance(0.24)}
            id="get-started"
            className="max-w-[32rem]"
          >
            <p className="text-[14.5px] leading-[1.65] text-zinc-600 sm:text-[15px]">
              We partner with ambitious companies to craft thoughtful
              identities and digital experiences that stand the test of time.
            </p>

            <a
              href="#contact"
              className="mt-5 inline-flex items-center justify-center rounded-full bg-black px-5 py-2.5 text-[13px] leading-none text-white transition-colors duration-300 hover:bg-zinc-800 focus-visible:bg-zinc-800 focus-visible:outline-none"
            >
              Get started
            </a>
          </motion.div>
        </div>
      </main>
    </section>
  );
}