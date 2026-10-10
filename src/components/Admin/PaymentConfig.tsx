import React from 'react';
import { OwnerMerchantSettings } from './OwnerMerchantSettings.tsx';
import { HotspotOwner } from '../../types/index.ts';

export interface PaymentConfigProps {
  currentUser?: HotspotOwner | null;
  onOwnerUpdated?: (owner: HotspotOwner) => void;
  lang?: 'sw' | 'en';
}

export const PaymentConfig: React.FC<PaymentConfigProps> = ({
  currentUser,
  onOwnerUpdated,
  lang = 'sw',
}) => {
  return (
    <OwnerMerchantSettings
      owner={currentUser}
      currentUser={currentUser}
      onUpdated={onOwnerUpdated}
      onOwnerUpdated={onOwnerUpdated}
      lang={lang}
    />
  );
};
