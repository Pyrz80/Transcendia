# Transcendia - Dynamic Semantic Internationalization (DAU)

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
</p>

Transcendia, geleneksel i18n sistemlerinin yerine geçen, **bağlam-duyarlı (context-aware)** ve **dinamik** bir çok dilli destek kütüphanesidir.

## 🚀 Özellikler

- **Semantic Key System**: `intent:greeting+context:app_entry` gibi anlamsal anahtarlarla çeviri
- **Context-Aware Engine**: Aynı kelime farklı bağlamlarda farklı çevrilir
- **Dynamic Updates**: Çeviri dosyaları deploy gerektirmeden buluttan güncellenir
- **Community Contribution**: Kullanıcılar öneri ve onay verebilir
- **Multi-Language SDKs**: JS, Python, Java, Swift, C#, Go, Rust desteği

## 📦 Paketler

| Paket | Açıklama |
|-------|-----------|
| `@transcendia/server` | Translation Hub API |
| `@transcendia/sdk` | JavaScript/TypeScript SDK |
| `@transcendia/admin` | Admin Panel |

## 🏗 Mimari

```
Application (Any Language)
         │
         ▼
    SDK Wrapper
         │
         ▼
Translation Hub (Cloud API)
 ┌───────────────┬───────────────┬───────────────┐
 │ Semantic Engine│ Translation DB│ Community Layer│
 │ Context-aware  │ Approved pool │ User input &   │
 │ mapping        │ of translations│ validation     │
 └───────────────┴───────────────┴───────────────┘
```

## 🛠️ Kurulum

### 1. Projeyi Klonla

```bash
git clone https://github.com/Pyrz80/-Transcendia-.git
cd transcendia
```

### 2. Bağımlılıkları Yükle

```bash
npm install
```

### 3. Docker ile Servisleri Başlat

```bash
docker-compose up -d
```

### 4. Veritabanını Migre Et

```bash
cd packages/server
npx prisma migrate dev
```

### 5. Geliştirme Sunucusunu Başlat

```bash
# API
npm run dev --workspace=@transcendia/server

# Admin Panel (ayrı terminal)
npm run dev --workspace=@transcendia/admin
```

## 📡 API Endpoints

### Çeviri

```bash
# Tek çeviri
GET /api/v1/translate?key=intent:greeting+context:app_entry&lang=tr

# Toplu çeviri
POST /api/v1/translate/batch
{
  "keys": ["intent:greeting", "intent:goodbye"],
  "lang": "tr"
}
```

### Diller

```bash
# Tüm diller
GET /api/v1/languages

# Belirli dil
GET /api/v1/languages/tr
```

### Katkı

```bash
# Çeviri önerisi
POST /api/v1/contribute
{
  "key": "intent:greeting",
  "lang": "tr",
  "value": "Merhaba",
  "comment": "İlk önerim"
}

# Katkıları listele
GET /api/v1/contribute?status=OPEN

# Katkıyı onayla
PUT /api/v1/contribute/:id/approve

# Katkıyı reddet
PUT /api/v1/contribute/:id/reject
```

## 💻 SDK Kullanımı

### JavaScript/TypeScript

```typescript
import { Transcendia } from '@transcendia/sdk';

const i18n = new Transcendia({
  apiUrl: 'http://localhost:3000',
  defaultLang: 'tr'
});

// Tek çeviri
const greeting = await i18n.t('intent:greeting+context:app_entry');

// Toplu çeviri
const translations = await i18n.tBatch([
  'intent:greeting',
  'intent:goodbye'
]);
```

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing`)
5. Pull Request oluşturun

## 📝 Lisans

MIT License - [LICENSE](LICENSE)
