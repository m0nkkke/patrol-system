# Модуль Files

Модуль `files` отвечает за загрузку, сжатие, хранение и защищенную выдачу файлов. Сейчас основная реализация хранит файлы локально на диске backend, но код использует storage-контракт, поэтому позже можно подключить объектное хранилище без изменения модулей контрольных точек и отчетов.

## Хранилища

Backend выбирает реализацию через `FILE_STORAGE_BACKEND`:

- `local` — рабочая реализация для 0.3.0. Файлы лежат в каталоге `FILE_STORAGE_LOCAL_ROOT`.
- `object` — зарезервированный контракт для будущего S3/MinIO-адаптера. При выборе без реализации возвращает `OBJECT_FILE_STORAGE_NOT_CONFIGURED`.

Локальный каталог является runtime-данными, а не частью репозитория. В Docker production он монтируется как volume `/app/storage`.
Ключи локального адаптера всегда разрешаются внутри `FILE_STORAGE_LOCAL_ROOT`; попытка выхода за
корень возвращает `FILE_STORAGE_INVALID_KEY`. Если метаданные файла есть, но байты отсутствуют на
диске, backend возвращает `404` с кодом `FILE_STORAGE_FILE_NOT_FOUND`.

## Конфигурация

```env
FILE_STORAGE_BACKEND=local
FILE_STORAGE_LOCAL_ROOT=./storage
FILE_UPLOAD_MAX_SIZE_MB=10
FILE_IMAGE_MAX_WIDTH=1600
FILE_IMAGE_QUALITY=80
```

## Модель данных

Таблица `file_assets` хранит метаданные:

- `owner_type`, `owner_id` — объект-владелец файла, например `patrol_point`;
- `kind` — тип файла, например `patrol_point_photo`;
- `storage` — выбранный backend хранения: `local` или `object`;
- `storage_key` — относительный путь/ключ файла внутри хранилища;
- `mime_type`, `size_bytes`, `checksum_sha256`, `width`, `height`;
- `uploaded_by`, `created_at`, `deleted_at`.

Байты файла в БД не хранятся.

## Обработка изображений

При загрузке изображение:

- проверяется по mime type и максимальному размеру;
- читается через `sharp`;
- автоматически поворачивается по EXIF;
- уменьшается до `FILE_IMAGE_MAX_WIDTH` без увеличения маленьких фото;
- сохраняется как `image/webp` с качеством `FILE_IMAGE_QUALITY`.

## Эндпоинты

- `GET /api/v1/files/:id` — защищенная выдача файла по ID. Доступ есть у всех авторизованных ролей.
- `POST /api/v1/patrol-points/:id/photo` — загрузка фото контрольной точки через `multipart/form-data`, поле `file`.

Выдача идет через backend, а не через открытую статическую директорию. Это оставляет место для проверки прав на файлы отчетов и архивов.
