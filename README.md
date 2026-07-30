# Kesvaro — Shopify theme

Кастомная тема Shopify (Online Store 2.0) для магазина **Kesvaro** — товары для собак и кошек.
Написана на Liquid без сборки и без внешних зависимостей: чистый CSS + vanilla JS.

Проверено официальной утилитой `shopify theme check` — **0 замечаний**.

---

## Как загрузить в Shopify

1. Скачайте `kesvaro-theme.zip` из этого репозитория (кнопка **Download raw file**).
2. В админке Shopify: **Online Store → Themes → Add theme → Upload zip file**.
3. Выберите архив, дождитесь загрузки.
4. Нажмите **Customize**, чтобы настроить содержимое, затем **Publish**, когда всё готово.

> Важно: загружать нужно именно `kesvaro-theme.zip`, а не архив всего репозитория —
> Shopify требует, чтобы папки `layout/`, `sections/`, `templates/` и т.д. лежали в корне архива.

### Пересобрать архив после правок

```bash
zip -r kesvaro-theme.zip assets config layout locales sections snippets templates -x '*.DS_Store'
```

---

## Что настроить после установки

| Где | Что |
|---|---|
| **Theme settings → Colors** | Палитра (по умолчанию: тёплый песок + зелёный акцент) |
| **Theme settings → Typography** | Шрифты заголовков и текста |
| **Theme settings → Cart** | Порог бесплатной доставки (по умолчанию 50 — в валюте магазина, EUR) |
| **Theme settings → Social media** | Ссылки на Instagram / TikTok / Facebook / YouTube / Pinterest |
| **Theme settings → Favicon** | Иконка вкладки |
| **Header** | Логотип и меню (`main-menu`) |
| **Footer** | Меню, текст помощи, подписка на рассылку |
| **Home page** | Все секции — картинки и видео загружаются в редакторе тем |

Изображений и видео в архиве нет — Shopify требует загружать их через админку.
Пока их нет, секции показывают штатные плейсхолдеры Shopify, вёрстка не ломается.

Для контактной страницы создайте страницу с шаблоном `page.contact`
(**Online Store → Pages → Add page → Theme template: contact**).

---

## Структура

```
assets/       theme.css, theme.js
config/       settings_schema.json, settings_data.json
layout/       theme.liquid, password.liquid
locales/      en.default.json, en.default.schema.json
sections/     37 секций
snippets/     8 сниппетов
templates/    JSON-шаблоны всех страниц + gift_card.liquid
```

### Секции главной страницы

`hero` (фото или видео на фоне) · `marquee` (бегущая строка) · `featured-collection` ·
`collection-list` · `video` (Shopify-видео или YouTube/Vimeo с ленивой загрузкой) ·
`image-with-text` (картинка или зацикленное видео) · `icons-row` (преимущества) ·
`testimonials` · `gallery` (мозаика фото/видео + лайтбокс) · `faq` · `newsletter` ·
`blog-posts` · `rich-text` · `contact-form`

Все секции добавляются, переставляются и удаляются в редакторе тем.

### Мультимедиа

- **Hero** — фоновое видео (muted, loop, autoplay) либо изображение.
- **Video** — обложка + плеер, который подгружается только по клику (не тормозит загрузку страницы). Работает с видео, загруженным в Shopify, и с YouTube/Vimeo.
- **Gallery** — мозаичная сетка фото и зацикленных видео, клик открывает лайтбокс.
- **Карточка товара** — второе фото при наведении.
- **Страница товара** — галерея с поддержкой фото, видео, внешних видео и **3D-моделей** (`model-viewer`), зум по клику, свайп на мобильных.

### Функциональность

- Корзина-drawer с AJAX (добавление без перезагрузки), полоса прогресса до бесплатной доставки, примечание к заказу.
- Быстрое добавление в корзину прямо из карточки товара.
- Выбор вариантов: недоступные комбинации отключаются, цена/наличие/фото/SKU/URL обновляются на лету.
- Индикатор остатка («осталось N штук»).
- Фильтры и сортировка на странице коллекции (Shopify Search & Discovery).
- Предиктивный поиск в выпадающей панели.
- Полный набор страниц аккаунта, блог с комментариями, страница подарочной карты, страница пароля.
- Разметка JSON-LD для товаров, Open Graph и Twitter Card.
- Адаптивность, `prefers-reduced-motion`, skip-link, фокус-стили, ARIA-атрибуты.

---

## Разработка

Локальный предпросмотр (нужен Shopify CLI):

```bash
shopify theme dev --store kesvaro.myshopify.com
shopify theme check
```
