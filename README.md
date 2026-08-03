> **Part of the [MyZubster ecosystem](https://github.com/MyZubster-Ecosystem)**

> **Part of the [MyZubster ecosystem](https://github.com/MyZubster-Ecosystem)**

> **Part of the [MyZubster ecosystem](https://github.com/MyZubster-Ecosystem)**

> **Part of the [MyZubster ecosystem](https://github.com/MyZubster-Ecosystem/myzubster)**
[![License](https://img.shields.io/github/license/MyZubster-Ecosystem/myzubster-animal-registry](LICENSE)) 
[![GitHub stars](https://img.shields.io/github/stars/MyZubster-Ecosystem/myzubster-animal-registry](https://github.com/MyZubster-Ecosystem/myzubster-animal-registry/stargazers)) 
[![GitHub issues](https://img.shields.io/github/issues/MyZubster-Ecosystem/myzubster-animal-registry](https://github.com/MyZubster-Ecosystem/myzubster-animal-registry/issues)) 
[![GitHub last commit](https://img.shields.io/github/last-commit/MyZubster-Ecosystem/myzubster-animal-registry](https://github.com/MyZubster-Ecosystem/myzubster-animal-registry/commits/main)) 
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green)](https://nodejs.org/)

# 🐾 MyZubster - Animal Registry

**Decentralized Animal Registry powered by Monero Blockchain**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Monero](https://img.shields.io/badge/Powered%20by-Monero-orange)](https://www.getmonero.org/)

---

## 🐶 What is MyZubster Animal Registry?

MyZubster Animal Registry is a decentralized platform for registering and verifying **all types of animals** on the Monero blockchain:

| Category | Examples |
|----------|----------|
| 🐶 **Pets** | Dogs, cats, birds, reptiles, rabbits, hamsters |
| 🐮 **Livestock** | Cows, pigs, sheep, goats, horses, chickens |
| 🐘 **Wildlife** | Elephants, tigers, bears, lions, wolves |
| 🐠 **Aquatic** | Fish, dolphins, whales, sharks, sea turtles |
| 🐝 **Insects** | Bees, butterflies, ants, beetles, spiders |

Every animal registered becomes a permanent, verifiable record on the blockchain.

---

## ✨ Features

- 🐾 **Universal Animal Registration** - Register any animal species
- 🔗 **Blockchain Verified** - Immutable records on Monero
- 💰 **Earn Rewards** - Get paid in XMR for registering and verifying animals
- 🌿 **Conservation** - 5% of fees go to animal welfare projects
- 🌍 **Global Map** - See registered animals worldwide
- 🏷️ **Species Classification** - Categorize by type (pet, livestock, wildlife, aquatic, insect)

---

## 📊 Economics

**Registration is FREE.**

MyZubster is an open-source, community-driven project. All animal registrations are free.

### How the Platform is Funded

The platform is sustained through:
- 💰 **Donations** – Voluntary contributions from the community
- 🚀 **Premium Services** – Optional paid features (certificates, analytics)
- 🤝 **Sponsors & Grants** – Corporate sponsorships and open source grants

### Fund Allocation

| Destination | Percentage |
|-------------|------------|
| Bounties | 90% |
| Infrastructure | 5% |
| Conservation | 5% |

### Donate to Support MyZubster

If you believe in this project, you can support us with a donation in Monero (XMR):

**Wallet:** `45M4DW1ug8bdQowWpxucTpgsfjLbVxbYaAra79VewmBobuuhgqTjyD4R3DzpqLM2veiphcB16n24qN1QbLg3y2PYGK3Qkoe`

[Full Economics Details →](ECONOMICS.md)

---
## 🤖 About This Project

**MyZubster is an experimental, open-source project.**

- **Nature:** This project is partially developed and maintained by an AI agent (Claude) alongside human contributors.
- **Status:** Alpha - The platform is in active development. Features may change.
- **Bounties:** Real Monero (XMR) payments are made for completed contributions.
- **Transparency:** All transactions are recorded in the public blockchain and tracked in `FUNDING.md`.

**Roadmap:**
- 🟡 Phase 1 (Q3 2026): Basic registration and verification
- 🟡 Phase 2 (Q4 2026): Mobile app and map
- 🟡 Phase 3 (Q1 2027): NFC integration and conservation partnerships
## 🚀 Getting Started

### Register an Animal

1. Find an animal (pet, livestock, wildlife, etc.)
2. Take photos and note GPS coordinates
3. Register on MyZubster Animal platform
4. Pay registration fee in XMR
5. Animal appears on the global map!

### Earn Rewards

| Action | Reward (XMR) |
|--------|--------------|
| Register Animal | 0.001 XMR |
| Verify Animal | 0.002 XMR |
| Update Health | 0.0005 XMR |
| Discover New Species | 0.01 XMR |

---

## 🔒 Privacy First

- ✅ No KYC required
- ✅ No personal data stored
- ✅ Payments in Monero (XMR) only
- ✅ Full anonymity for users

---

## 📈 Roadmap

| Phase | Timeline | Features |
|-------|----------|----------|
| Phase 1 | Q3 2026 | Basic platform launch, registration, map view |
| Phase 2 | Q4 2026 | Mobile app, verification system, rewards |
| Phase 3 | Q1 2027 | Conservation partnerships, AI species ID |
| Phase 4 | Q2 2027 | Global map expansion, API for integrations |

---

## 🤝 Contribute

We welcome:
- 🐾 Animal registrations
- 👨💻 Code contributions
- 💰 Donations to animal welfare fund
- 📝 Documentation improvements

---

## NFC Tag Generation

This repository includes a Node.js utility for generating NFC tag payloads for registered animals.

```bash
npm test
node bin/generate-nfc-tag.js registration.json
```

See [docs/nfc-tags.md](docs/nfc-tags.md) for the payload format, CLI usage, validation rules, and registration integration notes.

---

## NFC Tag Verification

Decoding and verifying scanned NFC tags is implemented in `src/nfcScanner.js`. It decodes `myzubster:nfc:v1:` URIs, validates the payload shape, looks up the registry record via an injectable `chainProvider`, and compares every relevant field. The module is pure JavaScript: no network, wallet, or mainnet access.

```bash
npm test
node bin/verify-nfc-tag.js registration.json
```

See [docs/verification.md](docs/verification.md) for the scan -> decode -> verify flow, the `chainProvider` contract, outcome statuses, and a React Native integration sketch.

---

## 📄 License

MIT - Free for everyone to use and modify.

---

**Built with ❤️ for animals by MyZubster-Ecosystem**
## 🔗 Related Projects

| Project | Description | Link |
|---------|-------------|------|
| **MyZubster Gateway** | Backend API for Monero payments and registry | [GitHub](https://github.com/MyZubster-Ecosystem/MyZubsterGateway) |
| **MyZubster Plant Map** | Global map for plant registration | [GitHub](https://github.com/MyZubster-Ecosystem/-MyZubster---Global-Plant-Map-powered-by-Monero-blockchain) |
| **MyZubster Animal Map** | Interactive map for animal registry | [GitHub](https://github.com/MyZubster-Ecosystem/myzubster-animal-map) |

---

## 🔗 Related Projects

| Project | Description | Link |
|---------|-------------|------|
| **MyZubster Gateway** | Backend API for Monero payments and registry | [GitHub](https://github.com/MyZubster-Ecosystem/MyZubsterGateway) |
| **MyZubster Plant Map** | Global map for plant registration | [GitHub](https://github.com/MyZubster-Ecosystem/-MyZubster---Global-Plant-Map-powered-by-Monero-blockchain) |
| **MyZubster Animal Map** | Interactive map for animal registry | [GitHub](https://github.com/MyZubster-Ecosystem/myzubster-animal-map) |

---

## 📚 Documentation

- [Economic Framework](ECONOMICS.md) – Tokenomics and fee structure
- [Registration Guide](ANIMAL_REGISTRATION.md) – How to register an animal
- [Contribution Guide](CONTRIBUTING.md) – How to contribute and earn XMR
- [Fund Transparency](FUNDING.md) – All transactions are public
- [API Documentation](docs/api.md) – API reference
- [Verification Process](docs/verification.md) – How verification works

## 🤝 Contributi

Contributi sono benvenuti! Dai un'occhiata alle [issue aperte]([Issues](https://github.com/MyZubster-Ecosystem/myzubster-animal-registry/issues)) e alla [roadmap]([Roadmap](https://github.com/users/MyZubster-Ecosystem/projects/1)).

## 🌐 Ecosystem Hub

**MyZubster Ecosystem**: https://github.com/MyZubster-Ecosystem

## 🌐 Ecosystem Hub

**MyZubster Ecosystem**: https://github.com/MyZubster-Ecosystem

## 🌐 Ecosystem Hub

**MyZubster Ecosystem**: https://github.com/MyZubster-Ecosystem


## 💬 Community

- **Telegram**: [@MyZubster_bot](https://t.me/MyZubster_bot) – for updates, support, and discussions.


## 🌐 Connect with Us

- **Telegram**: [@MyZubster_bot](https://t.me/MyZubster_bot) – updates, support, and discussions
- **Twitter / X**: [@DanielIoni](https://twitter.com/DanielIoni) – project announcements and thoughts
- **TikTok**: [@danielioni](https://tiktok.com/@danielioni) – behind the scenes and project updates
- **Instagram**: [@danielioni](https://instagram.com/danielioni) – visuals and community stories
- **dev.to**: [Daniel Ioni](https://dev.to/danielioni) – technical articles and project updates


## 💬 Community

- **Telegram Channel**: [@myzubster](https://t.me/myzubster) – follow for updates, news, and discussions about the MyZubster ecosystem.
