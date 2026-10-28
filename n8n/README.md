# Сценарии n8n для LeadOps

LeadOps разбирает компании, которые пользователь уже импортировал. Эти сценарии не обходят сайты, не собирают адреса электронной почты и не отправляют рекламу. n8n только читает и пишет локальный Postgres: ставит задания в `jobs` или фиксирует ручной допуск в `activities`. Аудит, квалификацию и текст черновика выполняет приложение, не n8n.

В этом дереве нет compose-файла платформы. Команду ниже запускают в каталоге ветки платформы, где описан профиль `automation`.

## Локальный запуск

```bash
docker compose --profile automation up -d
```

Откройте [http://127.0.0.1:5678](http://127.0.0.1:5678).

## Импорт

В n8n выберите импорт из файла и загрузите каждый JSON из `n8n/workflows/`:

- `a-discover-companies.json` — компании из локальной выборки;
- `b-enqueue-audit.json` — очередь аудита;
- `c-qualify.json` — очередь квалификации;
- `d-prepare-draft.json` — очередь черновика;
- `e-manual-gate.json` — ручной допуск без отправки.

Каждый файл — один объект сценария с полями `name`, `nodes`, `connections`, `settings`. У каждого узла есть `id` и `position`. Это сборка для импорта, а не выгрузка кнопкой Download из живого n8n. JSON проходит `JSON.parse`. Если редактор вашей версии не примет `typeVersion` узла Postgres (`2.5`), Code (`2`) или IF (`2.2`), откройте узел и подтвердите предложенную версию, не меняя SQL и не добавляя узлы отправки.

После импорта у узлов Postgres будет заглушка credential. Её нужно заменить на локальную учётную запись, описанную ниже. Сценарии импортируются неактивными, запуск только ручной.

## Учётные данные Postgres

Создайте в интерфейсе n8n credential типа Postgres с именем `LeadOps Local Postgres`. Укажите только локальную базу:

| Поле | Значение |
| --- | --- |
| Host | `127.0.0.1` |
| Port | `54329` |
| Database | `leadops` |
| User | `leadops` |
| Password | `leadops` |
| SSL | выключен |

Привяжите этот credential к каждому узлу Postgres. В JSON пароля нет: у заглушки id `REPLACE_WITH_LEADOPS_LOCAL_POSTGRES` и имя `LeadOps Local Postgres`.

Если процесс n8n находится в контейнере, `127.0.0.1` внутри контейнера — это сам контейнер. Credential всё равно должен смотреть в ту же локальную базу `leadops` на порту `54329`. Адрес, которым контейнер видит этот порт, задаёт профиль `automation` на ветке платформы. Удалённый или боевой сервер подставлять не нужно.

## Файл выборки

Канонический путь: `n8n/sample/companies.csv`.

Заголовок: `name,domain,website_url,industry,region,description,source_url`. В файле две вымышленные строки с доменами `.example`. Адресов почты и телефонов нет.

В сценарии A эти же две строки лежат в узле «Строки companies.csv». Так импорт работает без чтения диска контейнером. Если правите выборку, обновите и CSV, и массив `rows` в этом узле.

Нормализация домена идёт в памяти узла, без DNS и HTTP:

- обрезаются пробелы, регистр приводится к нижнему;
- снимаются схема, ведущий `www.`, порт, путь, query и fragment.

## Что делает каждый сценарий

Все пять сценариев начинаются с ручного триггера. Поисковые системы не вызываются.

### A. Импорт компаний

`Ручной запуск` → `Строки companies.csv` → `Upsert companies`.

Новая компания вставляется со `status = new` и `source = n8n/sample/companies.csv`. Если `domain` уже есть, обновляются только `name` и `source`. `status` в ветку `UPDATE` не входит, поэтому у существующей строки он остаётся прежним. Нужен уникальный индекс или ограничение на `companies.domain`.

### B. Очередь аудита

Выбираются компании со статусом `audit_pending` или `new`, не больше 10, по возрастанию `id`. Для каждой вставляется `jobs` с `type = audit` и `status = pending`, если такой pending-строки ещё нет. Браузер внутри n8n не запускается. Аудит выполняет приложение.

### C. Очередь квалификации

Выбираются компании, у которых есть `audits.status = completed` и нет строки в `opportunities`. Вставляется `jobs` с `type = qualify` и `status = pending`. Провайдер ИИ из n8n не вызывается: секреты и редактирование ответа остаются в приложении.

### D. Очередь черновика

Выбираются `opportunities` со статусом `approved_for_drafting`, для которых нет строки в `drafts` с тем же `opportunity_id`. Вставляется `jobs` с `type = draft` и `status = pending`. Узла отправки нет.

### E. Ручной допуск

Сценарий E не отправляет сообщения.

Он читает черновики со статусом `approved`, находит компанию через `drafts.opportunity_id` → `opportunities.company_id` → `companies.domain` и проверяет `suppression_list`.

- Домен есть в списке подавления: в `activities` пишется действие `blocked_by_suppression`.
- Домена нет: в `activities` пишется действие `ready_for_manual_contact`.

Черновик не обновляется и не переводится в состояние sent. Узлов SMTP, Email Send, Telegram и webhook нет. Повторный запуск не добавляет вторую activity с тем же действием для того же черновика. Дальше с компанией связывается человек, вне n8n.

## Контракт колонок

В этой ветке нет схемы LeadOps. SQL ниже рассчитан на такие колонки. Если на ветке платформы ключи имеют тип `uuid` или связь черновика с компанией устроена иначе, поправьте запросы под фактические имена, не добавляя отправку.

| Таблица | Колонки, которые читают или пишут сценарии |
| --- | --- |
| `companies` | `id`, `name`, `domain` (уникальный), `website_url`, `industry`, `region`, `description`, `source_url`, `source`, `status` (`new`, `audit_pending`) |
| `audits` | `company_id`, `status` (`completed`) |
| `opportunities` | `id`, `company_id`, `status` (`approved_for_drafting`) |
| `drafts` | `id`, `opportunity_id`, `status` (`approved` только читается) |
| `jobs` | `company_id`, `opportunity_id` (для типа `draft`), `type` (`audit`, `qualify`, `draft`), `status` (`pending`) |
| `activities` | `draft_id`, `company_id`, `action` (`ready_for_manual_contact`, `blocked_by_suppression`) |
| `suppression_list` | `domain` |

Таблицы `contacts` и `permissions` эти сценарии не используют.

Числовые ключи в запросах приводятся к `bigint`. Значения в Postgres передаются параметрами `$1`, `$2`, …, не склейкой строки.

## Проверка JSON

Из корня репозитория:

```bash
node -e "const fs=require('fs'); const path=require('path'); for (const f of fs.readdirSync('n8n/workflows').filter((name)=>name.endsWith('.json'))) { const data=JSON.parse(fs.readFileSync(path.join('n8n/workflows', f), 'utf8')); if (!data.name || !Array.isArray(data.nodes) || !data.connections || !data.settings) throw new Error('bad shape '+f); console.log('ok', f); }"
```

Команда должна завершиться без исключения и напечатать `ok` для каждого файла.
