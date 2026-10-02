import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageSquare,
  Send,
  CheckCircle2,
  Share2,
  ExternalLink,
  ShieldCheck,
  Building2,
  Info,
  Smartphone,
} from 'lucide-react';
import { CompanyPublicInfo, DEFAULT_COMPANY_INFO } from '../../types/index.ts';

interface ContactUsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAbout?: () => void;
  lang?: 'sw' | 'en';
}

export const ContactUsModal: React.FC<ContactUsModalProps> = ({
  isOpen,
  onClose,
  onOpenAbout,
  lang = 'sw',
}) => {
  const [info, setInfo] = useState<CompanyPublicInfo>({ ...DEFAULT_COMPANY_INFO });
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderMessage, setSenderMessage] = useState('');
  const [messageSent, setMessageSent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/v1/system/company-info')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.company_name) {
            setInfo(data);
          }
        })
        .catch((e) => console.error('Failed to load company info for contact modal:', e));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderPhone.trim() || !senderMessage.trim()) return;

    setIsSending(true);
    // Simulate instantaneous dispatch to backend or admin inquiry queue
    setTimeout(() => {
      setIsSending(false);
      setMessageSent(true);
      setSenderName('');
      setSenderPhone('');
      setSenderMessage('');
      setTimeout(() => setMessageSent(false), 5000);
    }, 600);
  };

  // Prepare clean whatsapp link
  const rawWa = (info.contact_whatsapp || '255754000111').replace(/[^0-9]/g, '');
  const waLink = `https://wa.me/${rawWa}?text=${encodeURIComponent(
    lang === 'sw'
      ? 'Habari INFOTECH WiFi, naomba maelezo kuhusu huduma za WiFi Hotspot na MikroTik...'
      : 'Hello INFOTECH WiFi, I would like to inquire about your Hotspot Billing & MikroTik services...'
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Header Banner */}
        <div className="relative p-6 sm:p-8 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 text-white overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/3 w-60 h-60 bg-[#f8a30a]/10 rounded-full blur-2xl pointer-events-none" />

          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold backdrop-blur-md">
              <Phone className="w-3.5 h-3.5" />
              <span>{lang === 'sw' ? 'Wasiliana Nasi' : 'Contact Us'}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight font-['Sora',sans-serif] text-white">
              {lang === 'sw' ? 'Mawasiliano & Huduma kwa Wateja' : 'Customer Support & Inquiries'}
            </h2>

            <p className="text-slate-300 text-xs sm:text-sm font-['Manrope',sans-serif] leading-relaxed">
              {lang === 'sw'
                ? info.support_note_sw ||
                  'Tuko tayari kukuhudumia masaa yote. Wasiliana nasi kwa simu, WhatsApp, au barua pepe.'
                : info.support_note_en ||
                  'We are available around the clock to support your hotspot installation and MikroTik setup.'}
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 font-sans">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Direct Contact Methods & Cards */}
            <div className="lg:col-span-7 space-y-4">
              {/* Phone & WhatsApp Card */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <span>{lang === 'sw' ? 'Namba za Simu & WhatsApp' : 'Direct Call & WhatsApp'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Primary Phone */}
                  <a
                    href={`tel:${info.contact_phone_primary}`}
                    className="p-3.5 rounded-xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/40 transition group flex flex-col justify-between"
                  >
                    <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                      {lang === 'sw' ? 'Simu Kuu / Hotline' : 'Primary Phone'}
                    </div>
                    <div className="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition">
                      {info.contact_phone_primary || '+255 754 000 111'}
                    </div>
                  </a>

                  {/* Secondary Phone if available */}
                  {info.contact_phone_secondary && (
                    <a
                      href={`tel:${info.contact_phone_secondary}`}
                      className="p-3.5 rounded-xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/40 transition group flex flex-col justify-between"
                    >
                      <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                        {lang === 'sw' ? 'Namba Mbadala' : 'Alternative Phone'}
                      </div>
                      <div className="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition">
                        {info.contact_phone_secondary}
                      </div>
                    </a>
                  )}
                </div>

                {/* WhatsApp Action Button */}
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-emerald-600/20"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>
                    {lang === 'sw'
                      ? `Tuma Ujumbe WhatsApp (${info.contact_whatsapp})`
                      : `Chat on WhatsApp (${info.contact_whatsapp})`}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Email Addresses */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  <span>{lang === 'sw' ? 'Barua Pepe Rasmi' : 'Official Email Addresses'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <a
                    href={`mailto:${info.contact_email_primary}`}
                    className="p-3.5 rounded-xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/40 transition group flex flex-col justify-between"
                  >
                    <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                      {lang === 'sw' ? 'Taarifa za Jumla' : 'General Inquiries'}
                    </div>
                    <div className="text-xs font-black text-slate-900 group-hover:text-indigo-700 truncate">
                      {info.contact_email_primary || 'info@tzwifi.co.tz'}
                    </div>
                  </a>

                  <a
                    href={`mailto:${info.contact_email_support}`}
                    className="p-3.5 rounded-xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/40 transition group flex flex-col justify-between"
                  >
                    <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                      {lang === 'sw' ? 'Msaada wa Kiufundi' : 'Technical Support'}
                    </div>
                    <div className="text-xs font-black text-slate-900 group-hover:text-indigo-700 truncate">
                      {info.contact_email_support || 'support@tzwifi.co.tz'}
                    </div>
                  </a>
                </div>
              </div>

              {/* Location & Hours */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-900">
                      {lang === 'sw' ? 'Ofisi Yetu Tanzania' : 'Office Location'}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {lang === 'sw' ? info.office_address_sw : info.office_address_en}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-2 border-t border-slate-200/70">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-900">
                      {lang === 'sw' ? 'Masaa ya Kazi' : 'Working Hours'}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {lang === 'sw' ? info.working_hours_sw : info.working_hours_en}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Quick Inquiry Form & Social Links */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  <span>{lang === 'sw' ? 'Tuma Ujumbe wa Papo kwa Papo' : 'Quick Inquiry Message'}</span>
                </div>

                {messageSent ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>
                      {lang === 'sw'
                        ? 'Asante! Ujumbe wako umepokelewa, timu yetu itawasiliana nawe hivi punde.'
                        : 'Thank you! Your message has been received, our support team will reach out promptly.'}
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {lang === 'sw' ? 'Jina Lako' : 'Your Name'}
                      </label>
                      <input
                        type="text"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="e.g. Kelvin"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {lang === 'sw' ? 'Namba ya Simu au Barua Pepe *' : 'Phone Number or Email *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={senderPhone}
                        onChange={(e) => setSenderPhone(e.target.value)}
                        placeholder="0754... / barua@pepe.com"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {lang === 'sw' ? 'Ujumbe au Swali Lako *' : 'Your Message / Inquiry *'}
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={senderMessage}
                        onChange={(e) => setSenderMessage(e.target.value)}
                        placeholder={
                          lang === 'sw'
                            ? 'Andika swali lako kuhusu kusanidi router, ununuzi wa vocha au malipo...'
                            : 'Write your inquiry...'
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium outline-none focus:border-indigo-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSending}
                      className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      {isSending ? (
                        <span>{lang === 'sw' ? 'Inatuma...' : 'Sending...'}</span>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>{lang === 'sw' ? 'Tuma Ujumbe Sasa' : 'Submit Message'}</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>

              {/* Social Media Links */}
              {info.social_links && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
                  <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    {lang === 'sw' ? 'Mitandao Yetu ya Kijamii' : 'Follow Our Channels'}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {info.social_links.whatsapp_group && (
                      <a
                        href={info.social_links.whatsapp_group}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-emerald-100/70 hover:bg-emerald-200 text-emerald-800 text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <span>WhatsApp Group</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    {info.social_links.telegram && (
                      <a
                        href={info.social_links.telegram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-sky-100/70 hover:bg-sky-200 text-sky-800 text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <span>Telegram</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    {info.social_links.instagram && (
                      <a
                        href={info.social_links.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-pink-100/70 hover:bg-pink-200 text-pink-800 text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <span>Instagram</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    {info.social_links.facebook && (
                      <a
                        href={info.social_links.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-blue-100/70 hover:bg-blue-200 text-blue-800 text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <span>Facebook</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {lang === 'sw'
                ? 'Msaada wa Kiufundi Unapatikana Masaa 24/7 Kote Nchini'
                : 'Technical Support Available 24/7 Countrywide'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {onOpenAbout && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAbout();
                }}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Info className="w-3.5 h-3.5 text-indigo-600" />
                <span>{lang === 'sw' ? 'Kuhusu Sisi' : 'About Us'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
            >
              <span>{lang === 'sw' ? 'Funga' : 'Close'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
