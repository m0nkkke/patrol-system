# Передача доступов и владение сервисами

## Принцип владения

Production-компоненты должны принадлежать организации-заказчику либо формально назначенной
организации сопровождения. Личная учётная запись разработчика не должна быть единственным
владельцем Expo, Firebase, Google Play или Android signing materials.

Документ фиксирует состав передаваемых активов и правила доступа. Значения паролей, private keys и
recovery codes здесь не размещаются. Они передаются через корпоративный менеджер секретов или
другой согласованный защищённый канал.

## Репозиторий

Заказчику передаются:

- доступ к Git-репозиторию и истории;
- право создавать защищённые ветки и релизные теги;
- описание процесса code review и выпуска;
- настройки CI/CD, если они используются;
- право управлять deploy keys и automation tokens.

Основная ветка и политика релизов не должны зависеть от личного fork. Секреты, локальные `.env` и
сгенерированные Android-каталоги не включаются в Git.

## Expo/EAS

EAS project обеспечивает сборки, обновления, внутреннее распространение и часть credentials.
Организация-владелец предоставляет роли участникам вместо передачи общего логина.

В составе передачи фиксируются:

| Актив | Назначение |
|---|---|
| Expo organization/account | Владелец проекта и биллинга |
| EAS project | Сборки, updates и internal distribution |
| Project ID и owner | Связь app config с проектом |
| EAS environments | Development, preview и production configuration |
| EAS channels | Разделение тестовых и рабочих updates |
| Build history | История APK/AAB и исходных commits |
| Update history | Опубликованные bundle и возможность отката |

После передачи представитель заказчика должен иметь право управлять участниками, environments,
credentials и сборками без участия личной учётной записи автора.

## Firebase

Firebase project содержит Android application, FCM и Crashlytics. Package name Firebase Android
app совпадает с production application ID.

Передаются роли Firebase/Google Cloud, а не логин владельца. Отдельно фиксируются:

- Firebase project ID;
- Android application entry;
- доступ к Crashlytics;
- право управлять Cloud Messaging;
- право создавать и отзывать service accounts;
- настройки ограничений клиентского API key;
- контакт владельца биллинга, если он используется.

`google-services.json` содержит клиентскую конфигурацию и хранится в защищённой системе поставки.
FCM V1 service account содержит private key и требует более строгого режима хранения. При передаче
проверяется, что EAS Credentials использует актуальный ключ из переданного Firebase-проекта.

## Android signing и Google Play

Для возможности обновлять приложение необходимо сохранить идентичность подписи.

В составе актива учитываются:

- Google Play Console application;
- application ID;
- Play App Signing status;
- app signing certificate fingerprints;
- upload key и процедура его сброса;
- Android keystore, alias и пароли, если ключ управляется вне Play;
- Google service account для EAS Submit;
- роли владельца, администратора релизов и просмотра статистики.

Ключ подписи хранится в резервной копии независимо от рабочей машины. Доступ к публикации и доступ
к финансовым или пользовательским данным Google Play разделяются ролями.

## Backend и домен

Хотя backend не относится к mobile-репозиторию как клиентский секрет, стабильная работа приложения
зависит от следующих активов:

- домен и DNS API;
- TLS certificate automation;
- хостинг backend;
- PostgreSQL, Redis и файловое хранилище;
- резервные копии;
- production environment variables;
- мониторинг и канал оповещения.

Mobile-команде предоставляется право видеть статус и контракт API, но не обязательно полный доступ
к базе и серверным секретам. Владелец домена и инфраструктуры должен быть известен до публикации
приложения.

## Разделение секретов

| Материал | Где хранится | В клиенте |
|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | EAS environment | Открытое значение |
| `GOOGLE_SERVICES_JSON` | EAS file variable / защищённая копия | Включается в native build |
| FCM V1 service account | EAS Credentials / secret manager | Не включается |
| Android keystore | EAS Credentials / защищённая резервная копия | Используется только для подписи |
| JWT secrets | Backend secret storage | Не включаются |
| Database и Redis credentials | Backend secret storage | Не включаются |
| Google Play service account | EAS Submit credentials / secret manager | Не включается |

## Смена команды сопровождения

Новая команда получает доступ через собственные корпоративные учётные записи. После подтверждения
работоспособности удаляются личные доступы предыдущего подрядчика, отзываются временные токены и
обновляются контактные лица.

Передача считается технически завершённой, когда новая команда самостоятельно может собрать
preview APK, выпустить production AAB, опубликовать OTA, увидеть Crashlytics, проверить push
credentials и восстановить доступ к signing materials без обращения к прежнему разработчику.
