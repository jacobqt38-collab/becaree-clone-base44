import { useState, useEffect } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Menu, X, Phone, ChevronDown } from "lucide-react";
import Logo from "./logo";

const navLinks = [
  { label: "الرئيسية", path: "/" },
  { label: "من نحن", path: "/about" },
  { label: "تواصل معنا", path: "/contact" },
];

const productMenu = [
  { name: "تأمين المركبات", path: "/reg", icon: "🚗" },
  { name: "التأمين الطبي", path: "/insurance/medical", icon: "🏥" },
  { name: "تأمين السفر", path: "/insurance/travel", icon: "✈️" },
  { name: "تأمين العمالة المنزلية", path: "/insurance/domestic", icon: "👥" },
  { name: "تأمين الأخطاء الطبية", path: "/insurance/medical-malpractice", icon: "🩺" },
  { name: "تأمين نقل البضائع", path: "/insurance/transport", icon: "🚚" },
];

export default function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
    setProductsOpen(false);
  }, [pathname]);

  const isActive = (path: string) => pathname === path;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/95 backdrop-blur-lg shadow-md" : "bg-white/80 backdrop-blur-sm"
      }`}
    >
      <div className="container-x">
        <div className="flex h-16 items-center justify-between md:h-20">
          <Link to="/" className="flex-shrink-0">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            <Link
              to="/"
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                isActive("/") ? "text-primary-600" : "text-dark-700 hover:text-primary-600"
              }`}
            >
              الرئيسية
            </Link>

            <div
              className="relative"
              onMouseEnter={() => setProductsOpen(true)}
              onMouseLeave={() => setProductsOpen(false)}
            >
              <button className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold text-dark-700 transition-colors hover:text-primary-600">
                منتجاتنا
                <ChevronDown className="h-4 w-4" />
              </button>
              {productsOpen && (
                <div className="absolute right-0 top-full w-72 animate-slide-down rounded-2xl border border-dark-100 bg-white p-2 shadow-xl">
                  {productMenu.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-dark-700 transition-colors hover:bg-primary-50 hover:text-primary-700"
                    >
                      <span className="text-lg">{item.icon}</span>
                      {item.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {navLinks.slice(1).map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  isActive(link.path) ? "text-primary-600" : "text-dark-700 hover:text-primary-600"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <a href="tel:920000000" className="flex items-center gap-2 text-sm font-semibold text-dark-700 transition-colors hover:text-primary-600">
              <Phone className="h-4 w-4" />
              920000000
            </a>
            <button
              onClick={() => navigate({ to: "/reg" })}
              className="btn-primary !py-2 !text-sm"
            >
              اشتر الآن
            </button>
          </div>

          <button onClick={() => setIsOpen(!isOpen)} className="rounded-lg p-2 text-dark-700 lg:hidden">
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="animate-slide-down border-t border-dark-100 bg-white lg:hidden">
          <nav className="container-x flex flex-col gap-1 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                  isActive(link.path) ? "bg-primary-50 text-primary-600" : "text-dark-700 hover:bg-dark-50"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {productMenu.map((item) => (
              <Link key={item.path} to={item.path} className="rounded-lg px-4 py-3 text-sm font-semibold text-dark-700 hover:bg-dark-50">
                <span className="ml-2">{item.icon}</span>
                {item.name}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-dark-100 pt-4">
              <button onClick={() => navigate({ to: "/reg" })} className="btn-primary !py-2 !text-sm">
                اشتر الآن
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
