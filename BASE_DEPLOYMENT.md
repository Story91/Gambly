# GamblyTest Token (TEST) - Deploy na Base

Instrukcje deployu kontraktu ERC20 GamblyTest na sieci Base.

## 🌐 Sieci Base

- **Base Mainnet**: Chain ID 8453
- **Base Sepolia (Testnet)**: Chain ID 84532

## 📋 Wymagania

1. **Private Key** w pliku `.env`
2. **ETH na Base** do opłat transakcyjnych
3. **Node.js** i **npm**

## 🛠️ Setup

### 1. Zainstaluj dependencies

```bash
npm install
```

### 2. Skonfiguruj .env

Upewnij się, że masz w pliku `.env`:

```env
PRIVATE_KEY=your_private_key_without_0x_prefix
BASESCAN_API_KEY=your_basescan_api_key_for_verification (opcjonalne)
```

### 3. Kompiluj kontrakt

```bash
npm run compile
```

## 🚀 Deploy

### Deploy na Base Sepolia (Testnet)

1. **Pobierz testnet ETH**:
   - Idź na: https://bridge.base.org/deposit
   - Lub użyj faucet: https://docs.base.org/tools/network-faucets

2. **Deploy**:
```bash
npm run deploy:base-sepolia
```

### Deploy na Base Mainnet

⚠️ **UWAGA**: To kosztuje prawdziwe ETH!

```bash
npm run deploy:base
```

## 💰 Koszty Deploymentu

- **Base Sepolia**: ~0.0001 ETH (testnet)
- **Base Mainnet**: ~0.001-0.005 ETH (około $2-10)

## 📊 Po Deployu

Kontrakt automatycznie:
- ✅ Minta 1,000,000 TEST tokenów na adres deployer'a
- ✅ Ustawia max supply na 10,000,000 TEST
- ✅ Przypisuje ownership do deployer'a

## 🔍 Weryfikacja

### Automatyczna weryfikacja na BaseScan

Po deployu użyj komendy podanej w output'cie:

```bash
# Base Mainnet
npx hardhat verify --network base <CONTRACT_ADDRESS> "<DEPLOYER_ADDRESS>"

# Base Sepolia  
npx hardhat verify --network base-sepolia <CONTRACT_ADDRESS> "<DEPLOYER_ADDRESS>"
```

### Ręczna weryfikacja

1. Idź na [BaseScan](https://basescan.org) (mainnet) lub [Base Sepolia](https://sepolia.basescan.org)
2. Znajdź swój kontrakt po adresie
3. Kliknij "Contract" → "Verify and Publish"
4. Wybierz Solidity 0.8.20, optymalizacja: Yes (200 runs)

## 🔧 Funkcje Kontraktu

### Owner Functions
- `mint(address to, uint256 amount)` - Mintuje tokeny
- `batchMint(address[] recipients, uint256[] amounts)` - Mintuje do wielu adresów

### Public Functions  
- `transfer()`, `approve()`, `transferFrom()` - Standard ERC20
- `burn(uint256 amount)` - Spala tokeny
- `getTokenInfo()` - Zwraca informacje o tokenie

## 📱 Dodanie do Wallet

Po deployu możesz dodać token do MetaMask:

1. **Contract Address**: `<adres_po_deployu>`
2. **Token Symbol**: `TEST`
3. **Decimals**: `18`

## 🌉 Bridge do Base

### Z Ethereum na Base:
- Użyj: https://bridge.base.org/deposit

### Z innych sieci:
- Użyj: https://www.relay.link/bridge/base/

## ⚠️ Bezpieczeństwo

- ✅ Używamy OpenZeppelin (sprawdzone biblioteki)
- ✅ Solidity 0.8.20 (overflow protection)
- ✅ Max supply limit (10M tokenów)
- ✅ Owner-only minting
- ⚠️ **Nigdy nie udostępniaj PRIVATE_KEY!**

## 🆘 Troubleshooting

### "insufficient funds for intrinsic transaction cost"
- Potrzebujesz więcej ETH na swoim adresie

### "nonce too high" lub "nonce too low"  
- Zrestartuj Hardhat: `npx hardhat clean`

### Problemy z RPC
- Base czasami ma przeciążone RPC, spróbuj ponownie za chwilę

## 📋 Checklist Deployu

- [ ] Private key w `.env`
- [ ] ETH na adresie deployer'a  
- [ ] `npm install` wykonane
- [ ] `npm run compile` bez błędów
- [ ] Deploy przez `npm run deploy:base-sepolia` lub `npm run deploy:base`
- [ ] Zweryfikuj kontrakt na BaseScan
- [ ] Dodaj token do wallet
- [ ] Przetestuj transfer tokenów

## 🔗 Przydatne Linki

- [Base Documentation](https://docs.base.org/)
- [BaseScan](https://basescan.org/)
- [Base Bridge](https://bridge.base.org/)
- [Base Faucets](https://docs.base.org/tools/network-faucets) 