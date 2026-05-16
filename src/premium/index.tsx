/**
 * Optional premium module loader.
 *
 * Cluegent production no longer loads legacy promo/trial surfaces here. Keep only
 * the extension points still referenced by the app so open-source builds continue
 * to degrade to no-op components when the private premium folder is absent.
 */
import React from 'react';

const NullComponent: React.FC<any> = () => null;

const _profileVis = import.meta.glob<any>(
  '../../premium/src/ProfileVisualizer.tsx',
  { eager: true }
);
const _negotiationCard = import.meta.glob<any>(
  '../../premium/src/NegotiationCoachingCard.tsx',
  { eager: true }
);
const _modesSettings = import.meta.glob<any>(
  '../../premium/src/ModesSettings.tsx',
  { eager: true }
);

function get<T>(mods: Record<string, any>, name: string, fallback: T): T {
  const mod = Object.values(mods)[0];
  return mod?.[name] ?? fallback;
}

export const ProfileVisualizer: React.FC<any> =
  get(_profileVis, 'ProfileVisualizer', NullComponent);

export const NegotiationCoachingCard: React.FC<any> =
  get(_negotiationCard, 'NegotiationCoachingCard', NullComponent);

export const PremiumUpgradeModal: React.FC<any> = NullComponent;

export const ModesSettings: React.FC<any> =
  get(_modesSettings, 'default', NullComponent);
