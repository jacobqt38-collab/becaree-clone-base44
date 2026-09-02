import { Link } from "@tanstack/react-router";
import { Phone, Mail, MapPin, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import Logo from "./logo";

const footerLinks = {
  products: [
    { label: "تأمين المركبات", path: "/reg" },
    { label: "التأمين الطبي", path: "/insurance/medical" },
    { label: "تأمين السفر", path: "/insurance/travel" },
    { label: "تأمين العمالة المنزلية", path: "/insurance/domestic" },
    { label: "تأمين الأخطاء الطبية", path: "/insurance/medical-malpractice" },
  ],
  company: [
    { label: "من نحن", path: "/about" },
    { label: "تواصل معنا", path: "/contact" },
    { label: "الأسئلة الشائعة", path: "/faq" },
  ],
  legal: [
    { label: "الشروط والأحكام", path: "/terms" },
    { label: "سياسة الخصوصية", path: "/privacy" },
  ],
};

export default function SiteFooter() {
  return (
    <footer className="bg-dark-900 text-dark-300">
      <div className="container-x py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Logo variant="light" />
            <p className="text-sm leading-relaxed text-dark-400">
              بيكير - المنصة الأذكى لمقارنة عروض تأمين السيارات في السعودية. احصل على أرخص تأمين
              سيارات مع إصدار فوري وربط مباشر بنجم.
            </p>
            <div className="flex gap-3">
              {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                <a key={i} href="#" className="flex h-10 w-10 items-center justify-center rounded-xl bg-dark-800 text-dark-400 transition-all hover:bg-primary-600 hover:text-white">
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-base font-bold text-white">منتجاتنا</h3>
            <ul className="space-y-2">
              {footerLinks.products.map((link) => (
                <li key={link.label}>
                  <Link to={link.path} className="text-sm text-dark-400 transition-colors hover:text-primary-400">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-base font-bold text-white">روابط مهمة</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link to={link.path} className="text-sm text-dark-400 transition-colors hover:text-primary-400">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-base font-bold text-white">تواصل معنا</h3>
            <ul className="space-y-3">
              <li className="flex min-w-0 items-center gap-3 text-sm text-dark-400">
                <Phone className="h-5 w-5 text-primary-500" />
                <span dir="ltr">920 000 000</span>
              </li>
              <li className="flex min-w-0 items-center gap-3 text-sm text-dark-400">
                <Mail className="h-5 w-5 text-primary-500" />
                info@becaree.com
              </li>
              <li className="flex min-w-0 items-start gap-3 text-sm text-dark-400">
                <MapPin className="h-5 w-5 text-primary-500" />
                <span className="break-words">الرياض، المملكة العربية السعودية</span>
              </li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-lg bg-dark-800 px-3 py-1 text-xs font-medium text-dark-300">
                مصرح من: هيئة التأمين
              </span>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-dark-800 pt-8 md:flex-row">
          <p className="text-center text-sm text-dark-400 md:text-right">جميع الحقوق محفوظة، شركة بيكير لوساطة التأمين © 2026</p>
          <div className="flex flex-wrap justify-center gap-4">
            {footerLinks.legal.map((link) => (
              <Link key={link.label} to={link.path} className="text-xs text-dark-400 transition-colors hover:text-primary-400">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
