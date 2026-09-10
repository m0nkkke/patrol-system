import { hashAccessKey } from '../common/auth/access-key';
import { readBootstrapAdminConfig } from './bootstrap-admin';

describe('readBootstrapAdminConfig', () => {
  it('normalizes a strong configured access key', () => {
    const config = readBootstrapAdminConfig({
      BOOTSTRAP_ADMIN_ACCESS_KEY: 'k7qm-9xpt-4rwd',
      BOOTSTRAP_ADMIN_FULL_NAME: 'Главный администратор',
      BOOTSTRAP_ADMIN_USERNAME: 'production.admin',
    });

    expect(config).toEqual({
      accessKey: 'K7QM-9XPT-4RWD',
      accessKeyHash: hashAccessKey('K7QM-9XPT-4RWD'),
      fullName: 'Главный администратор',
      username: 'production.admin',
    });
  });

  it('requires a key when administrator bootstrap is needed', () => {
    expect(() => readBootstrapAdminConfig({})).toThrow(
      'BOOTSTRAP_ADMIN_ACCESS_KEY is required',
    );
  });

  it('rejects a predictable key', () => {
    expect(() =>
      readBootstrapAdminConfig({ BOOTSTRAP_ADMIN_ACCESS_KEY: 'AAAA-AAAA-1111' }),
    ).toThrow('too predictable');
  });
});
