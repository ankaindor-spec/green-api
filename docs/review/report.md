# Ревью LeadOps

Срез `origin`: 2026-10-28, 15:18 UTC. Около 70 минут из `/workspace` выполнялся `git fetch origin` раз в минуту. В конце ожидания fetch повторён отдельно, чтобы поймать поздние ветки. Код смотрелся через `git diff` и содержимое файлов на коммите, без описаний pull request.

База `origin/main`: `ed9703b8047fe85c4a4ffa2757da60c17bb64192`.

## Что проверено

| Ветка | Коммит | База diff |
| --- | --- | --- |
| `cursor/leadops-n8n-0612` | `81995bb25174449287ede8f2ae26b614fbd7925f` | `origin/main` |
| `cursor/leadops-architect-0612` | нет на origin | — |
| `cursor/leadops-platform-0612` | нет на origin | — |
| `cursor/leadops-companies-0612` | нет на origin | должна была быть `origin/cursor/leadops-platform-0612` |
| `cursor/leadops-audits-0612` | нет на origin | должна была быть `origin/cursor/leadops-platform-0612` |
| `cursor/leadops-commercial-0612` | нет на origin | должна была быть `origin/cursor/leadops-platform-0612` |

Ветка `cursor/leadops-review-0612` — этот отчёт.

Коммит n8n: «Add LeadOps n8n workflows that only write local Postgres», один коммит поверх `main`. Diff `origin/main...origin/cursor/leadops-n8n-0612` — 7 файлов, +756 строк:

- `n8n/README.md`
- `n8n/sample/companies.csv`
- `n8n/workflows/a-discover-companies.json`
- `n8n/workflows/b-enqueue-audit.json`
- `n8n/workflows/c-qualify.json`
- `n8n/workflows/d-prepare-draft.json`
- `n8n/workflows/e-manual-gate.json`

`package.json` и `prisma/schema.prisma` этот diff не меняет.

Узлы во всех пяти JSON: `n8n-nodes-base.manualTrigger`, `n8n-nodes-base.code`, `n8n-nodes-base.postgres`, `n8n-nodes-base.if`, `n8n-nodes-base.stickyNote`. У каждого сценария `"active": false`.

## Блокеры

1. На origin нет `cursor/leadops-architect-0612` и `cursor/leadops-platform-0612`. В доступном коде нет схемы Prisma, compose, живого аудита, вызова ИИ и экранов приложения. Из-за этого не из чего подтвердить SSRF (частные IP, localhost, metadata, редиректы), вырезание email и телефона, пропуск ИИ при пустом `AI_API_KEY`, набор таблиц, русский UI и то, что публичный email не считается согласием на рекламу. Это блокер сборки LeadOps. В коммите `81995bb25174449287ede8f2ae26b614fbd7925f` этих подсистем нет, и сценарии n8n их не подменяют: аудит, квалификацию и текст черновика README отдаёт приложению.

## Предупреждения

1. Локальный запуск описан в `n8n/README.md`: `docker compose --profile automation up -d` и интерфейс на `http://127.0.0.1:5678`. VPS инструкция не требует. Compose-файла в ветке нет, README отсылает к каталогу ветки платформы. На срезе команду выполнить не из чего.

2. Привязка Postgres и n8n к `127.0.0.1` кодом этой ветки не задана. `n8n/README.md` называет хост `127.0.0.1` и порт `54329`, секции `ports:` в репозитории нет. Проверка «не `0.0.0.0`» для этой ветки ограничена текстом README.

3. SQL завязан на `bigint` и уникальный `companies.domain`. В `n8n/workflows/a-discover-companies.json` upsert идёт через `ON CONFLICT (domain)`. Вставки в `jobs` и `activities` приводят ключи к `$1::bigint`. Раздел «Контракт колонок» в `n8n/README.md` перечисляет ожидаемые колонки и статусы (`new`, `audit_pending`, `completed`, `approved_for_drafting`, `approved`). Схемы Prisma в срезе нет. При `uuid` или других именах колонок сценарии не выполнятся. README сам предлагает править запросы под фактическую схему.

4. Таблица учётных данных в `n8n/README.md` ставит Host `127.0.0.1`. Там же сказано, что из контейнера n8n этот адрес — сам контейнер, а адрес порта `54329` должен задать профиль `automation`. Профиля в срезе нет, таблица и оговорка расходятся.

## Заметки

1. В JSON пароля нет. У узлов Postgres заглушка `REPLACE_WITH_LEADOPS_LOCAL_POSTGRES` с именем `LeadOps Local Postgres`. Файла `.env` в diff нет. Строка пароля `leadops` есть только в таблице локального стенда в `n8n/README.md`. Это пароль локальной базы из инструкции, не ключ внешнего сервиса и не credential внутри workflow JSON.

2. Отправка почты, SMS и мессенджера в сценариях не собрана. Сценарий E (`n8n/workflows/e-manual-gate.json`) читает черновики со статусом `approved`, сверяет домен с `suppression_list` и пишет в `activities` действие `blocked_by_suppression` либо `ready_for_manual_contact`. `drafts` запрос не обновляет и в `sent` не переводит. Повторная activity с тем же действием для того же `draft_id` отсекается через `NOT EXISTS`. Утверждение черновика само по себе сообщение не доставляет.

3. Обхода сайтов и сбора адресов нет. `n8n/sample/companies.csv` содержит две вымышленные строки доменов `.example` без почты и телефона. Узел «Строки companies.csv» в `n8n/workflows/a-discover-companies.json` держит тот же массив. Нормализация домена — обрезка строки в памяти (схема, `www.`, порт, путь, query). HTTP-запросов в узле нет.

4. Сценарий C (`n8n/workflows/c-qualify.json`) только ставит `jobs` с `type = qualify` и `status = pending` для компании с `audits.status = completed` и без строки в `opportunities`. Узла провайдера ИИ нет. Редакцию почты и телефона и отключение при пустом `AI_API_KEY` эта ветка не реализует.

5. Имена узлов, заметки и `n8n/README.md` на русском. Экранов приложения в ветке нет.

6. Имя `n8n/workflows/a-discover-companies.json` шире поведения: узел подставляет статический CSV, к каталогам и сети не ходит.

7. Таблицы `contacts` и `permissions` сценарии не читают и не пишут. `n8n/README.md` это фиксирует. Остальные имена из чеклиста в SQL есть: `companies`, `audits`, `opportunities`, `drafts`, `activities`, `suppression_list`, `jobs`. Создания таблиц в ветке нет.

8. Сценарий B (`n8n/workflows/b-enqueue-audit.json`) берёт до 10 компаний со статусом `audit_pending` или `new` и ставит `jobs.type = audit`. Браузер и HTTP внутри n8n не запускаются. Импорт A создаёт компании со статусом `new`, поэтому следующий ручной запуск B ставит их в очередь аудита. Сам аудит остаётся за приложением.

## Открытые вопросы

1. Совпадут ли типы ключей и статусы будущей схемы Prisma с контрактом в `n8n/README.md` (`bigint`, уникальный `companies.domain`, статусы выше)?

2. Где живой аудит закроет SSRF: частные IP, localhost, metadata и редиректы? Ветка `cursor/leadops-audits-0612` на срезе отсутствует, сценарий B только пишет очередь.

3. Где путь ИИ вырезает email и телефон и не вызывается при пустом `AI_API_KEY`? Сценарий C провайдера не вызывает.

4. Где фиксируется, что публичный email не является согласием на рекламу? В проверенных файлах модели согласия нет.

5. Кто создаёт `contacts` и `permissions`, если n8n их не касается, а ветки платформы нет?

6. Будут ли порты Postgres и n8n в compose платформы привязаны к `127.0.0.1`, а не к `0.0.0.0`?
