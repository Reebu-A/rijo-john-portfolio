// ui.js
(function () {
  const THEME_KEY = "jp-theme";

  function getPreferredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;

    if (window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "light";
  }

  function applyTheme(theme, withTransition) {
    const root = document.documentElement;
    const body = document.body;
    root.setAttribute("data-theme", theme);

    if (withTransition) {
      // enable smooth transition after first manual toggle
      body.classList.add("theme-transition");
    }

    updateThemeToggleIcon(theme);
  }

  function updateThemeToggleIcon(theme) {
    const toggle = document.getElementById("themeToggle");
    if (!toggle) return;

    const sun = toggle.querySelector(".theme-toggle__icon--sun");
    const moon = toggle.querySelector(".theme-toggle__icon--moon");

    if (theme === "dark") {
      sun.style.opacity = "0";
      sun.style.transform = "scale(0.7) rotate(-10deg)";
      moon.style.opacity = "1";
      moon.style.transform = "scale(1) rotate(0deg)";
      toggle.setAttribute("aria-pressed", "true");
      toggle.setAttribute("aria-label", "Switch to light mode");
    } else {
      sun.style.opacity = "1";
      sun.style.transform = "scale(1) rotate(0deg)";
      moon.style.opacity = "0";
      moon.style.transform = "scale(0.7) rotate(-10deg)";
      toggle.setAttribute("aria-pressed", "false");
      toggle.setAttribute("aria-label", "Switch to dark mode");
    }
  }

  function initTheme() {
    const initial = getPreferredTheme();
    applyTheme(initial, false);
  }

  function initThemeToggle() {
    const toggle = document.getElementById("themeToggle");
    if (!toggle) return;

    toggle.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "light";
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next, true);
    });
  }

  function initMobileNav() {
    const navToggle = document.getElementById("navToggle");
    const navLinks = document.getElementById("primaryNav");

    if (!navToggle || !navLinks) return;

    function closeMenu() {
      navToggle.classList.remove("nav__toggle--open");
      navToggle.setAttribute("aria-expanded", "false");
      navLinks.classList.remove("nav__links--open");
    }

    function openMenu() {
      navToggle.classList.add("nav__toggle--open");
      navToggle.setAttribute("aria-expanded", "true");
      navLinks.classList.add("nav__links--open");
    }

    navToggle.addEventListener("click", () => {
      const isOpen = navToggle.classList.contains("nav__toggle--open");
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // Close when a link is clicked (on mobile)
    navLinks.addEventListener("click", (e) => {
      if (e.target.closest(".nav__link")) {
        closeMenu();
      }
    });

    // Close on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeMenu();
      }
    });

    // Close when clicking outside on small screens
    document.addEventListener("click", (e) => {
      if (
        window.innerWidth <= 768 &&
        !navLinks.contains(e.target) &&
        !navToggle.contains(e.target)
      ) {
        closeMenu();
      }
    });
  }

// ---------------------------------------------
// Academic profile: sticky pills + active state
// ---------------------------------------------
function initAcademicSubnav() {
  const subnavSection = document.querySelector(".section--subnav");
  if (!subnavSection) return; // only on academic-profile page

  const subnav = subnavSection.querySelector(".subnav");
  if (!subnav) return;

  const links = Array.from(
    subnav.querySelectorAll('.subnav__link[href^="#"]')
  );
  if (!links.length) return;

  // Map each pill to its section
  const pairs = links
    .map((link) => {
      const id = link.getAttribute("href").slice(1);
      const section = document.getElementById(id);
      return section ? { section, link } : null;
    })
    .filter(Boolean);

  if (!pairs.length) return;

  const header = document.querySelector(".site-header");

  // Ensure only one pill is active
  function setActive(activeLink) {
    links.forEach((link) => {
      link.classList.toggle("subnav__link--active", link === activeLink);
    });
  }

  // How far down the page we want the section heading to land
  function getOffset() {
    const headerHeight = header ? header.offsetHeight : 80;
    const subnavHeight = subnavSection.offsetHeight || 0;
    // header + sticky pills + a little breathing space
    return headerHeight + subnavHeight + 8;
  }

  // Smooth scroll when clicking a pill
  function scrollToSection(section) {
    const rect = section.getBoundingClientRect();
    const y = window.pageYOffset + rect.top - getOffset();

    window.scrollTo({
      top: y,
      behavior: "smooth",
    });
  }

  // Click behaviour: smooth scroll + immediate visual feedback
  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (!href || !href.startsWith("#")) return;

      const section = document.querySelector(href);
      if (!section) return;

      e.preventDefault();

      // Instant feedback so mobile doesn’t feel “stuck”
      setActive(link);
      scrollToSection(section);
    });
  });

  // Scroll behaviour: choose the section whose top is just above the reference line
  function handleScroll() {
    const offset = getOffset();
    const scrollPos = window.pageYOffset + offset;

    let currentPair = pairs[0];

    pairs.forEach((pair) => {
      if (pair.section.offsetTop <= scrollPos) {
        currentPair = pair;
      }
    });

    if (currentPair) {
      setActive(currentPair.link);
    }
  }

  window.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener("resize", handleScroll);

  // Initial highlight on load
  handleScroll();
}



   document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initThemeToggle();
  initMobileNav();
  initAcademicSubnav();             
  setTimeout(() => {
    document.body.classList.add("theme-transition");
  }, 50);
});


})();


