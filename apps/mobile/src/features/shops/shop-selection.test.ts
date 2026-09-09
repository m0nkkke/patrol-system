import type { Shop } from '@/api/types';

import { orderPrimaryShop, toggleShopSelection } from './shop-selection';

function shop(id: string): Shop {
  return {
    id,
    name: `Shop ${id}`,
    timezone: 'Asia/Irkutsk',
    isActive: true,
    routeStatus: 'not_configured',
    routeExpectedPoints: 0,
    routeRegisteredPoints: 0,
  };
}

describe('shop selection', () => {
  it('makes the first selected shop primary', () => {
    const result = toggleShopSelection({ shops: [] }, shop('one'));
    expect(result.primaryShopId).toBe('one');
  });

  it('promotes the next shop when the primary shop is removed', () => {
    const result = toggleShopSelection(
      { shops: [shop('one'), shop('two')], primaryShopId: 'one' },
      shop('one'),
    );
    expect(result.primaryShopId).toBe('two');
  });

  it('keeps the primary shop when another shop is removed', () => {
    const result = toggleShopSelection(
      { shops: [shop('one'), shop('two')], primaryShopId: 'one' },
      shop('two'),
    );
    expect(result.primaryShopId).toBe('one');
  });

  it('orders the primary shop first when applying', () => {
    const result = orderPrimaryShop({
      shops: [shop('one'), shop('two'), shop('three')],
      primaryShopId: 'three',
    });
    expect(result.map((item) => item.id)).toEqual(['three', 'one', 'two']);
  });

});
