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


function showSiteToast({ title, message, onRemind }) {
  const toast = document.createElement('div');
  toast.className = 'site-toast';

  toast.innerHTML = `
    <div class="site-toast__title">${title}</div>
    <div>${message}</div>
    <div class="site-toast__actions">
      <button class="site-toast__btn site-toast__btn--primary">Remind me</button>
      <button class="site-toast__btn site-toast__btn--ghost">Dismiss</button>
    </div>
  `;

  document.body.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.add('site-toast--show');
  });

  const [remindBtn, dismissBtn] =
    toast.querySelectorAll('.site-toast__btn');

  dismissBtn.onclick = () => closeToast();
  remindBtn.onclick = () => {
    closeToast();
    if (typeof onRemind === 'function') onRemind();
  };

  // Auto dismiss after 10s
  const autoTimer = setTimeout(closeToast, 10000);

  function closeToast() {
    clearTimeout(autoTimer);
    toast.classList.remove('site-toast--show');
    setTimeout(() => toast.remove(), 300);
  }
}


function scheduleLocalReminder(event) {
  if (!event || !event.startTime) return;


  const date = new Date(event._iso || event.date);
  if (isNaN(date)) return;

  const [h, m] = event.startTime.split(':').map(Number);
  date.setHours(h, m, 0, 0);

  const diff = date - new Date();
  if (diff <= 0) return;

  setTimeout(() => {
    showSiteToast({
      title: '⏰ Event reminder',
      message: `${event.title} is starting now`,
    });
  }, diff);
}

// Helper: format 12-hour time
  function formatTime12Hour(timeStr) {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }


function checkGlobalEventToasts() {
  const now = new Date();

  Object.keys(localStorage).forEach((key) => {
    if (!key.startsWith('event-meta-')) return;

    try{
    const data = JSON.parse(localStorage.getItem(key));
    if (!data || !data.startTime) return;

    const eventDate = new Date(data.date);
    if (isNaN(eventDate)) return;

    const [h, m] = data.startTime.split(':').map(Number);
    eventDate.setHours(h, m, 0, 0);

    const diff = eventDate - now;

    // 🔔 STARTING SOON window (30 min)
    if (diff > 0 && diff <= 30 * 60 * 1000) {
      const firedKey = `event-fired-${data.id}`;
      if (localStorage.getItem(firedKey)) return;

       const time12hr = formatTime12Hour(data.startTime);

      showSiteToast({
        title: '⏰ Event starting soon',
         message: `${data.title} starts at ${time12hr}`,
          onRemind: () => scheduleLocalReminder(data),
      });

      localStorage.setItem(firedKey, '1');
    }

    if (diff < -2 * 60 * 60 * 1000) { // 2 hours after event
        localStorage.removeItem(key);
        localStorage.removeItem(`event-fired-${data.id}`);
      }
    }catch (err) {
      console.warn('Error checking event toast:', err);
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
  checkGlobalEventToasts();  
  
   // Check for event toasts every 30 seconds on all pages
  setInterval(checkGlobalEventToasts, 30000);

  setTimeout(() => {
    document.body.classList.add("theme-transition");
  }, 50);
});

// 🔓 Expose toast helpers globally (required for Events page)
window.showSiteToast = showSiteToast;
window.scheduleLocalReminder = scheduleLocalReminder;


})();


