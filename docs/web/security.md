# Безопасность web-сессии

## Статус

> **PRODUCTION BLOCKER:** до выполнения требований этого документа web-панель нельзя развертывать в production.

В development access и refresh токены хранятся в `sessionStorage`. Это временное решение для проверки UI и backend-контрактов. JavaScript страницы имеет доступ к этим токенам, поэтому XSS может привести к их компрометации.

При входе, выходе и истечении сессии кеш React Query очищается и текущие запросы отменяются. Запросы помечаются поколением сессии; ответ предыдущего поколения не попадает в новый интерфейс. Refresh проверяет исходный refresh token перед сохранением результата и не может восстановить завершённую сессию. Эти меры устраняют смешивание данных пользователей, но не заменяют production cookie-сессию.

## Обязательная production-схема

Перед production необходимо реализовать backend-managed web-сессию:

- refresh/session cookie с атрибутами `HttpOnly`, `Secure` и явно выбранным `SameSite`;
- короткоживущий access token только в памяти приложения либо полностью cookie-based авторизация;
- отсутствие access/refresh токенов в `localStorage` и `sessionStorage`;
- ротация refresh-сессии и отзыв всей цепочки при повторном использовании старого токена;
- CSRF-защита для изменяющих запросов, если cookies отправляются автоматически;
- точный allowlist origins в CORS без wildcard и с корректным `credentials`;
- ограниченный срок жизни сессии, принудительный logout и отзыв при деактивации пользователя;
- аудит входа, refresh, logout, отказов и отзыва web-сессий;
- защита cookie и security headers на reverse proxy: HSTS, CSP, `X-Content-Type-Options`, `Referrer-Policy`;
- rate limiting для login/refresh;
- интеграционные тесты входа, ротации, CSRF, истечения и отзыва сессии.

## Критерий снятия блокировки

Production blocker снимается только после удаления browser-readable token storage из `apps/web/src/lib/session.ts`, прохождения security-тестов и обновления production deployment документации.
