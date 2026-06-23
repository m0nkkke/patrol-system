import { UserRole } from '@patrol/shared';

import { ShopEntity } from '../../modules/shops/entities/shop.entity';

export type AuthenticatedUser = {
  fullName: string;
  id: string;
  role: UserRole;
  shop?: ShopEntity;
  shopId?: string;
  shopIds?: string[];
  shops?: ShopEntity[];
  username: string;
};
