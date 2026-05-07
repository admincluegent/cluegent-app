const root = document.documentElement;
const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelectorAll(".site-nav a");
const revealItems = document.querySelectorAll(".reveal");

if (menuToggle) {
  menuToggle.addEventListener("click", () => {
    const open = root.classList.toggle("menu-open");
    menuToggle.setAttribute("aria-expanded", String(open));
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    root.classList.remove("menu-open");
    menuToggle?.setAttribute("aria-expanded", "false");
  });
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.14,
    rootMargin: "0px 0px -10% 0px",
  }
);

revealItems.forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index * 45, 220)}ms`;
  observer.observe(item);
});
