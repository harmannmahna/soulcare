import { useEffect, useState } from "react";
import { ArrowRight, ChevronDown, Triangle } from "lucide-react";

const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260820_010308_b1636845-4c15-4ab6-b0c9-9a29bfb0c6e3.mp4";

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition duration-300 ${
          scrolled ? "bg-brand-cream/90 backdrop-blur-md shadow-sm" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="relative flex items-center h-16 md:h-20">
            <div className="hidden md:flex items-center gap-8 animate-fade-down stagger-1">
              <button
                type="button"
                className="flex items-center gap-1 text-sm text-brand-dark tracking-wide uppercase hover:opacity-70 transition-opacity"
              >
                Solutions
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <a
                href="#plans"
                className="text-sm text-brand-dark tracking-wide uppercase hover:opacity-70 transition-opacity"
              >
                Plans
              </a>
              <a
                href="#news"
                className="text-sm text-brand-dark tracking-wide uppercase hover:opacity-70 transition-opacity"
              >
                News
              </a>
            </div>

            <a
              href="#"
              className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 animate-fade-down stagger-2"
            >
              <Triangle className="w-5 h-5 text-brand-dark fill-brand-dark" />
              <span className="text-xl text-brand-dark tracking-tight font-helvetica-neue">Palomar</span>
            </a>

            <a
              href="#"
              className="hidden md:inline-flex items-center ml-auto px-5 py-2.5 bg-brand-dark text-white text-sm tracking-wide uppercase rounded-full hover:bg-brand-green transition-colors animate-fade-down stagger-3"
            >
              Try It Free
            </a>

            <button
              type="button"
              className="md:hidden ml-auto z-50 w-10 h-10 relative"
              aria-label="Toggle menu"
              onClick={() => setOpen((v) => !v)}
            >
              <span
                className={`absolute left-2 top-[6px] w-6 h-[2px] bg-brand-dark rounded transition-all duration-300 ease-[cubic-bezier(0.68,-0.6,0.32,1.6)] ${
                  open ? "rotate-45 translate-y-[5px]" : ""
                }`}
              />
              <span
                className={`absolute left-2 top-[13px] w-6 h-[2px] bg-brand-dark rounded transition-all duration-300 ease-[cubic-bezier(0.68,-0.6,0.32,1.6)] ${
                  open ? "-rotate-45" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </nav>

      <div
        className={`md:hidden fixed inset-0 bg-brand-cream z-40 transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className={`flex flex-col items-center justify-center h-full gap-8 transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] delay-100 ${
            open ? "translate-y-0 opacity-100" : "-translate-y-8 opacity-0"
          }`}
        >
          <a href="#solutions" className="text-3xl text-brand-dark tracking-tight" onClick={close}>
            Solutions
          </a>
          <a href="#plans" className="text-3xl text-brand-dark tracking-tight" onClick={close}>
            Plans
          </a>
          <a href="#news" className="text-3xl text-brand-dark tracking-tight" onClick={close}>
            News
          </a>
          <a
            href="#"
            className="mt-4 inline-flex items-center px-8 py-3.5 bg-brand-dark text-white text-lg tracking-wide rounded-full"
            onClick={close}
          >
            Try It Free
          </a>
        </div>
      </div>
    </>
  );
}

function TrustedBy() {
  return (
    <div className="w-full mt-8 md:mt-10 animate-fade-up stagger-5">
      <p className="text-left text-xs tracking-[0.25em] uppercase text-brand-dark/50 mb-6 md:mb-8 font-helvetica-neue">
        Backed by
      </p>
      <div className="flex flex-wrap items-center justify-start gap-6 md:gap-12 lg:gap-16 animate-fade-up stagger-6">
        <span className="text-lg md:text-xl lg:text-2xl text-brand-dark/80 whitespace-nowrap font-playfair">
          Meridian
        </span>
        <span className="text-lg md:text-xl lg:text-2xl text-brand-dark/80 whitespace-nowrap font-oswald uppercase">
          STELLEX
        </span>
        <span className="text-lg md:text-xl lg:text-2xl text-brand-dark/80 whitespace-nowrap font-montserrat">
          Luminar
        </span>
        <span className="text-lg md:text-xl lg:text-2xl text-brand-dark/80 whitespace-nowrap font-roboto-slab uppercase">
          OVERLAND
        </span>
        <span className="text-lg md:text-xl lg:text-2xl text-brand-dark/80 whitespace-nowrap font-raleway">
          Kinetic
        </span>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative w-full h-screen min-h-[700px] overflow-hidden bg-brand-cream">
      <div className="absolute inset-0">
        <video
          src={VIDEO_SRC}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover object-bottom"
        />
      </div>

      <div className="relative z-10 flex flex-col items-start max-w-7xl mx-auto pt-28 md:pt-36 px-6 lg:px-8">
        <a
          href="#"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-dark/15 bg-white/60 backdrop-blur-sm hover:bg-white/80 transition-colors mb-5 md:mb-6 animate-fade-up stagger-3"
        >
          <span className="text-sm text-brand-dark">Live for everyone today! Offering $1MM in credits.</span>
          <ArrowRight className="w-3.5 h-3.5 text-brand-dark" />
        </a>

        <h1 className="text-left text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-brand-dark leading-[1.05] tracking-tight max-w-4xl font-helvetica-neue animate-fade-up stagger-4">
          One unified system to build,
          <br className="hidden sm:block" /> test, ship, and observe LLMs
        </h1>

        <TrustedBy />
      </div>
    </section>
  );
}

export default function App() {
  return (
    <div className="font-helvetica-neue">
      <Navbar />
      <Hero />
    </div>
  );
}
