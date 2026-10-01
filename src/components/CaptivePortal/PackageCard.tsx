import React from 'react';
import { Plan, PortalThemeConfig } from '../../types/index.ts';
import { formatTzs } from '../../utils/carrierInfo.ts';
import { getCardRadiusClass, getCardShadowStyle, getBorderWidth } from '../../utils/themePresets.ts';
import { Clock, Database, Check, ArrowRight } from 'lucide-react';

interface PackageCardProps {
  plan: Plan;
  isSelected: boolean;
  onSelect: () => void;
  onPayNow?: () => void;
  lang: 'sw' | 'en';
  theme?: PortalThemeConfig;
}

export const PackageCard: React.FC<PackageCardProps> = ({
  plan,
  isSelected,
  onSelect,
  onPayNow,
  lang,
  theme,
}) => {
  const isTimeBased = plan.type === 'TIME_BASED';

  // Determine Badge: Check explicit plan.badge or custom badge_text first, with fallback to plan.price
  let badgeLabel: string | null = null;
  let badgeBg: string = theme?.accentColor || '#f59e0b';
  const badgeTextColor = '#ffffff';

  if (plan.badge === 'POPULAR' || (!plan.badge && plan.price === 1500)) {
    badgeLabel = plan.badge_text || (lang === 'sw' ? 'Inayopendwa Zaidi' : 'Most Popular');
    badgeBg = theme?.accentColor || '#f59e0b';
  } else if (plan.badge === 'BEST_VALUE' || (!plan.badge && plan.price === 5000)) {
    badgeLabel = plan.badge_text || (lang === 'sw' ? 'Nafuu Zaidi' : 'Best Value');
    badgeBg = theme?.primaryColor || '#059669';
  } else if (plan.badge === 'SUPER_FAST') {
    badgeLabel = plan.badge_text || (lang === 'sw' ? '⚡ Kasi ya Juu' : '⚡ Super Fast');
    badgeBg = '#6366f1';
  } else if (plan.badge === 'HOT_DEAL') {
    badgeLabel = plan.badge_text || (lang === 'sw' ? '🔥 Ofa Maalum' : '🔥 Hot Deal');
    badgeBg = '#ef4444';
  } else if (plan.badge === 'CUSTOM' || (plan.badge_text && plan.badge !== 'NONE')) {
    badgeLabel = plan.badge_text || null;
    badgeBg = theme?.accentColor || '#d97706';
  }

  // Resolve styles from theme if configured
  const radiusClass = getCardRadiusClass(theme?.cardRadius);
  const borderWidth = getBorderWidth(theme?.cardBorderThickness);
  const shadowStyle = getCardShadowStyle(theme?.cardShadow, theme?.primaryColor);

  // Background and border colors
  let containerBg = isSelected
    ? theme?.cardActiveBgColor || '#f0fdf4'
    : theme?.cardBgColor || '#ffffff';
  let containerBorder = isSelected
    ? theme?.cardActiveBorderColor || theme?.primaryColor || '#059669'
    : theme?.cardBorderColor || '#e2e8f0';

  const isGlass = theme?.cardStyle === 'glassmorphism';
  const isNeoBrutalist = theme?.cardStyle === 'neo_brutalist';

  const cardStyleObj: React.CSSProperties = {
    backgroundColor: containerBg,
    borderColor: containerBorder,
    borderWidth: borderWidth,
    borderStyle: 'solid',
    boxShadow: isNeoBrutalist
      ? isSelected
        ? '5px 5px 0px #000000'
        : '3px 3px 0px #000000'
      : shadowStyle,
    backdropFilter: isGlass ? 'blur(16px)' : undefined,
    WebkitBackdropFilter: isGlass ? 'blur(16px)' : undefined,
  };

  const textColor = theme?.cardTextColor || (theme?.textColor?.startsWith('#f') ? '#f8fafc' : '#0f172a');
  const priceColor = isSelected
    ? theme?.cardActiveBorderColor || theme?.primaryColor || '#059669'
    : theme?.priceTagColor || theme?.primaryColor || '#059669';

  return (
    <div
      onClick={onSelect}
      style={cardStyleObj}
      className={`relative cursor-pointer p-3 sm:p-4 transition-all duration-200 select-none overflow-hidden ${radiusClass} ${
        isSelected ? 'scale-[1.01]' : 'hover:scale-[1.005]'
      }`}
    >
      {/* Featured Badges - Clean inline pill so it never clips or overflows outside card */}
      {badgeLabel && (
        <div className="flex justify-end mb-1.5 -mt-0.5">
          <span
            style={{
              backgroundColor: badgeBg,
              color: badgeTextColor,
            }}
            className="inline-block text-[9px] sm:text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs tracking-wide max-w-full truncate"
          >
            {badgeLabel}
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 min-w-0">
            <div
              style={{
                backgroundColor: isSelected
                  ? theme?.primaryColor || '#059669'
                  : isGlass
                  ? 'rgba(255,255,255,0.1)'
                  : '#f1f5f9',
                color: isSelected
                  ? '#ffffff'
                  : isGlass
                  ? '#ffffff'
                  : '#334155',
              }}
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            >
              {isTimeBased ? (
                <Clock className="w-4 h-4" />
              ) : (
                <Database className="w-4 h-4" />
              )}
            </div>
            <h3
              style={{ color: textColor }}
              className="font-bold text-sm sm:text-base leading-snug break-words hyphens-auto min-w-0 flex-1"
              title={plan.name}
            >
              {plan.name.split('(')[0].trim()}
            </h3>
          </div>

          <p
            style={{
              color: isGlass ? 'rgba(255,255,255,0.75)' : undefined,
            }}
            className={`text-xs mt-1 line-clamp-2 break-words leading-relaxed ${isGlass ? '' : 'text-slate-600'}`}
          >
            {lang === 'sw' ? plan.description_sw : plan.description_en}
          </p>

          {/* Feature Bullet Points if configured */}
          {plan.features && plan.features.length > 0 && (
            <div className="mt-2 space-y-1 min-w-0">
              {plan.features.map((feat, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-600 min-w-0">
                  <Check className="w-3 h-3 text-emerald-600 shrink-0 stroke-[2.5]" />
                  <span className="truncate break-words">{feat}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pricing and Selection Radio */}
        <div className="flex flex-col items-end justify-between self-stretch shrink-0 pl-1.5 min-w-[68px]">
          <div
            style={{
              borderColor: isSelected
                ? theme?.primaryColor || '#059669'
                : isGlass
                ? 'rgba(255,255,255,0.3)'
                : '#cbd5e1',
              backgroundColor: isSelected
                ? theme?.primaryColor || '#059669'
                : isGlass
                ? 'rgba(255,255,255,0.1)'
                : '#ffffff',
              color: '#ffffff',
            }}
            className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
          >
            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
          </div>

          <div className="text-right shrink-0">
            <div
              style={{ color: priceColor }}
              className="text-base sm:text-lg font-black leading-tight whitespace-nowrap"
            >
              {formatTzs(plan.price)}
            </div>
            <div
              style={{
                color: isGlass ? 'rgba(255,255,255,0.6)' : undefined,
              }}
              className={`text-[9px] uppercase font-bold mt-0.5 ${isGlass ? '' : 'text-slate-500'}`}
            >
              TZS
            </div>
          </div>
        </div>
      </div>

      {/* Lipia Sasa / Pay Now Button */}
      <div
        style={{
          borderTopColor: isGlass ? 'rgba(255,255,255,0.12)' : undefined,
        }}
        className={`mt-2.5 pt-2 border-t flex flex-wrap items-center justify-between gap-1.5 min-w-0 ${isGlass ? '' : 'border-slate-100'}`}
      >
        <span
          style={{
            color: isGlass ? 'rgba(255,255,255,0.7)' : undefined,
          }}
          className={`text-[10px] font-medium truncate min-w-0 flex-1 ${isGlass ? '' : 'text-slate-500'}`}
        >
          {lang === 'sw' ? 'Malipo ya Simu' : 'Mobile Money'}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
            if (onPayNow) {
              onPayNow();
            }
          }}
          style={
            isSelected
              ? {
                  backgroundColor: theme?.primaryColor || '#059669',
                  color: '#ffffff',
                  boxShadow: isNeoBrutalist ? '2px 2px 0px #000000' : undefined,
                }
              : isNeoBrutalist
              ? {
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  borderColor: '#000000',
                  borderWidth: '2px',
                  boxShadow: '2px 2px 0px #000000',
                }
              : {
                  backgroundColor: isGlass ? 'rgba(255,255,255,0.2)' : undefined,
                  color: isGlass ? '#ffffff' : theme?.primaryColor || '#059669',
                  borderColor: isGlass ? 'rgba(255,255,255,0.3)' : undefined,
                }
          }
          className={`px-2.5 py-1 rounded-xl font-bold text-xs transition flex items-center gap-1 shrink-0 whitespace-nowrap cursor-pointer ${
            isSelected
              ? 'hover:brightness-110 shadow-xs'
              : isGlass
              ? 'hover:bg-white/30 border'
              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
          }`}
        >
          <span>{lang === 'sw' ? 'Lipia Sasa' : 'Pay Now'}</span>
          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
        </button>
      </div>
    </div>
  );
};
